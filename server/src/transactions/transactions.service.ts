import { Injectable, BadRequestException } from '@nestjs/common';
import {
  InvestmentEventSource,
  InvestmentEventStatus,
  InvestmentEventType,
} from '@prisma/client';
import type { TransactionType } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { RecordWithdrawalDto } from './dto/record-withdrawal.dto';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { TransactionRepository } from './repositories/transaction.repository';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { FinancialAccountsService } from '../financial-accounts/financial-accounts.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly investmentEventsService: InvestmentEventsService,
    private readonly contributionPlansService: InvestmentContributionPlansService,
    private readonly investmentRepository: InvestmentRepository,
    private readonly financialAccountsService: FinancialAccountsService,
  ) {}

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(id, userId);
  }

  async create(createTransactionDto: CreateTransactionDto, userId: number) {
    await this.validateExpenseSourceBalance(createTransactionDto, userId);
    return this.repository.create(createTransactionDto, userId);
  }

  async update(
    id: number,
    updateTransactionDto: UpdateTransactionDto,
    userId: number,
  ) {
    const existingTransaction = await this.repository.findOne(id, userId);
    if (!existingTransaction) {
      return null;
    }

    const mergedTransaction = {
      ...existingTransaction,
      ...updateTransactionDto,
    } as CreateTransactionDto;

    await this.validateExpenseSourceBalance(mergedTransaction, userId, id);
    return this.repository.update(id, updateTransactionDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date) {
    return this.repository.findByDateRange(userId, startDate, endDate);
  }

  async findByType(userId: number, type: TransactionType) {
    return this.repository.findByType(userId, type);
  }

  async recordContribution(recordContributionDto: RecordContributionDto, userId: number) {
    const investment = await this.ensureOwnedInvestment(recordContributionDto.investmentId, userId);
    if (investment.accountId == null) {
      throw new BadRequestException(
        'Investment must have a linked funding account before recording a contribution.',
      );
    }

    const sourceAccountId = Number(investment.accountId);
    const contributionPlanId = await this.resolveContributionPlanId(recordContributionDto, userId);

    // 1. Create Transaction
    const transactionDto: CreateTransactionDto = {
      type: 'INVESTMENT',
      categoryId: null,
      goalId: null,
      sourceAccountId,
      destinationAccountId: null,
      amount: recordContributionDto.amount,
      categoryLabelSnapshot: null,
      date: recordContributionDto.transactionDate,
      notes: recordContributionDto.notes || `Contribution for investment ${recordContributionDto.investmentId}`,
    };

    await this.validateExpenseSourceBalance(transactionDto, userId);

    const transaction = await this.repository.create(transactionDto, userId);

    // 2. Create InvestmentEvent
    const investmentEventDto = {
      investmentId: String(recordContributionDto.investmentId),
      linkedTransactionId: String(transaction.id),
      eventType: InvestmentEventType.CONTRIBUTION,
      status: InvestmentEventStatus.CONFIRMED,
      eventSource: InvestmentEventSource.MANUAL,
      eventDate: recordContributionDto.transactionDate,
      amount: recordContributionDto.amount,
      units: null,
      pricePerUnit: null,
      netAmount: recordContributionDto.amount,
      notes: `Linked to transaction ${transaction.id}`,
      meta: { linkedTransactionId: transaction.id },
    };

    const investmentEvent = await this.investmentEventsService.create(investmentEventDto, userId);

    // 3. Advance recurring plan's next due date only when a plan was resolved.
    // InvestmentEvent creation synchronizes the principal total.
    if (contributionPlanId != null) {
      await this.contributionPlansService.advanceNextDueDate(contributionPlanId);
    }

    return {
      transaction,
      investmentEvent,
      message: 'Contribution recorded successfully',
    };
  }

  async recordWithdrawal(recordWithdrawalDto: RecordWithdrawalDto, userId: number) {
    const investment = await this.ensureOwnedInvestment(recordWithdrawalDto.investmentId, userId);
    const amount = Number(recordWithdrawalDto.amount);
    const totalInvested = Number(investment.totalInvested || 0);

    if (amount > totalInvested) {
      throw new BadRequestException(
        `Withdrawal exceeds invested principal. Available: ${totalInvested.toFixed(2)}, requested: ${amount.toFixed(2)}.`,
      );
    }

    const transaction = await this.repository.create(
      {
        type: 'INCOME',
        categoryId: null,
        categoryLabelSnapshot: null,
        goalId: null,
        sourceAccountId: null,
        destinationAccountId: investment.accountId ?? null,
        amount,
        date: recordWithdrawalDto.transactionDate,
        notes: recordWithdrawalDto.notes || `Withdrawal from investment ${recordWithdrawalDto.investmentId}`,
      },
      userId,
    );

    const investmentEvent = await this.investmentEventsService.create(
      {
        investmentId: recordWithdrawalDto.investmentId,
        linkedTransactionId: String(transaction.id),
        eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL,
        status: InvestmentEventStatus.CONFIRMED,
        eventSource: InvestmentEventSource.MANUAL,
        eventDate: recordWithdrawalDto.transactionDate,
        amount,
        units: null,
        pricePerUnit: null,
        netAmount: amount,
        notes: `Linked to transaction ${transaction.id}`,
        meta: { linkedTransactionId: transaction.id },
      },
      userId,
    );

    return { transaction, investmentEvent, message: 'Withdrawal recorded successfully' };
  }

  private async resolveContributionPlanId(
    recordContributionDto: RecordContributionDto,
    userId: number,
  ): Promise<number | null> {
    const rawPlanId = String(recordContributionDto.contributionPlanId ?? '').trim();
    const parsedPlanId = Number(rawPlanId);

    if (
      rawPlanId &&
      rawPlanId !== 'undefined' &&
      rawPlanId !== 'null' &&
      !Number.isNaN(parsedPlanId) &&
      parsedPlanId > 0
    ) {
      const plan = await this.contributionPlansService.findOne(String(parsedPlanId), userId);
      if (!plan || String(plan.investmentId) !== String(recordContributionDto.investmentId)) {
        throw new BadRequestException(
          `No contribution plan ${parsedPlanId} found for investmentId ${recordContributionDto.investmentId}`,
        );
      }

      if (String(plan.status || '').trim().toLowerCase() !== 'active') {
        throw new BadRequestException(
          'Recurring plan is paused. Resume the plan before recording a contribution.',
        );
      }

      return parsedPlanId;
    }

    const plans = await this.contributionPlansService.findAllByInvestment(
      recordContributionDto.investmentId,
      userId,
    );
    const activePlan = plans.find(
      (plan) => String(plan.status || '').trim().toLowerCase() === 'active',
    );

    // No active plan — allow ad-hoc contribution without advancing any schedule
    return activePlan ? Number(activePlan.id) : null;
  }

  private async ensureOwnedInvestment(investmentId: string, userId: number) {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) {
      throw new BadRequestException(
        `Invalid investmentId ${investmentId}. Investment does not exist for this user.`,
      );
    }

    return investment;
  }

  private async validateExpenseSourceBalance(
    createTransactionDto: Pick<CreateTransactionDto, 'type' | 'amount' | 'sourceAccountId'>,
    userId: number,
    excludeTransactionId?: number,
  ): Promise<void> {
    if (createTransactionDto.type !== 'EXPENSE') return;

    const sourceAccountId = Number(createTransactionDto.sourceAccountId);
    if (!Number.isFinite(sourceAccountId) || sourceAccountId <= 0) return;

    const account = await this.financialAccountsService.findOne(sourceAccountId, userId);
    if (!account) return;

    let availableBalance = account.currentBalance;
    if (excludeTransactionId) {
      const excluded = await this.repository.findOne(excludeTransactionId, userId);
      if (excluded && Number(excluded.sourceAccountId) === sourceAccountId && excluded.type === 'EXPENSE') {
        availableBalance += Number(excluded.amount || 0);
      }
    }

    const requestedAmount = Number(createTransactionDto.amount || 0);
    if (requestedAmount <= 0) return;

    if (requestedAmount > availableBalance) {
      throw new BadRequestException(
        `Insufficient balance in source account. Available: ${availableBalance.toFixed(2)}, requested: ${requestedAmount.toFixed(2)}.`,
      );
    }
  }
}
