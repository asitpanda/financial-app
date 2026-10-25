import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import {
  InvestmentEventSource,
  InvestmentEventStatus,
  InvestmentEventType,
} from '@prisma/client';
import type { Prisma, TransactionType } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { RecordWithdrawalDto } from './dto/record-withdrawal.dto';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { TransactionRepository } from './repositories/transaction.repository';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { FinancialAccountsService } from '../financial-accounts/financial-accounts.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly investmentEventsService: InvestmentEventsService,
    private readonly contributionPlansService: InvestmentContributionPlansService,
    private readonly investmentRepository: InvestmentRepository,
    private readonly financialAccountsService: FinancialAccountsService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(id, userId);
  }

  async create(createTransactionDto: CreateTransactionDto, userId: number) {
    await this.validateSourceAccountBalance(createTransactionDto, userId);
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

    await this.assertOpenLinkedInvestment(existingTransaction, userId);

    const mergedTransaction = {
      ...existingTransaction,
      ...updateTransactionDto,
    } as CreateTransactionDto;

    await this.validateSourceAccountBalance(mergedTransaction, userId, id);
    return this.repository.update(id, updateTransactionDto, userId);
  }

  async remove(id: number, userId: number) {
    const existingTransaction = await this.repository.findOne(id, userId);
    if (!existingTransaction) {
      return null;
    }
    await this.assertOpenLinkedInvestment(existingTransaction, userId);
    return this.repository.delete(id, userId);
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date) {
    return this.repository.findByDateRange(userId, startDate, endDate);
  }

  async findByType(userId: number, type: TransactionType) {
    return this.repository.findByType(userId, type);
  }

  async recordContribution(recordContributionDto: RecordContributionDto, userId: number) {
    return this.prisma.$transaction(async (transactionClient) => {
      const replay = await this.findRecordedActivity(recordContributionDto, userId, transactionClient, false);
      if (replay) return replay;
      const investment = await this.assertOpenInvestment(recordContributionDto.investmentId, userId, transactionClient);
      if (investment.accountId == null) {
        throw new BadRequestException(
          'Investment must have a linked funding account before recording a contribution.',
        );
      }

      const sourceAccountId = Number(investment.accountId);
      const contributionPlanId = await this.resolveContributionPlanId(recordContributionDto, userId);
      const contributionPlan = contributionPlanId == null
        ? null
        : await transactionClient.investmentContributionPlan.findFirst({
          where: { id: contributionPlanId, investmentId: investment.id, status: 'active' },
        });
      if (contributionPlanId != null && !contributionPlan) {
        throw new BadRequestException('The contribution plan is no longer active. Refresh and try again.');
      }
      await this.assertMatchingAccountCurrency(sourceAccountId, investment.currency, userId, transactionClient);

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

      await this.validateSourceAccountBalance(transactionDto, userId);

      const transaction = await this.repository.create(transactionDto, userId, transactionClient);

      // 2. Create InvestmentEvent
      const investmentEventDto = {
        investmentId: String(recordContributionDto.investmentId),
        linkedTransactionId: String(transaction.id),
        recurringPlanId: contributionPlanId == null ? undefined : String(contributionPlanId),
        dueDate: contributionPlan?.nextDueDate
          ? new Date(contributionPlan.nextDueDate).toISOString().slice(0, 10)
          : undefined,
        eventType: investment.accountingTreatment === 'INVESTMENT'
          ? InvestmentEventType.CONTRIBUTION
          : InvestmentEventType.PREMIUM,
        status: InvestmentEventStatus.CONFIRMED,
        eventSource: InvestmentEventSource.MANUAL,
        eventDate: recordContributionDto.transactionDate,
        amount: recordContributionDto.amount,
        units: null,
        pricePerUnit: null,
        netAmount: recordContributionDto.amount,
        notes: `Linked to transaction ${transaction.id}`,
        meta: { linkedTransactionId: transaction.id, ...(recordContributionDto.requestId ? { requestId: recordContributionDto.requestId } : {}) },
      };

      const investmentEvent = await this.investmentEventsService.create(investmentEventDto, userId, transactionClient);

      // 3. Advance recurring plan's next due date only when a plan was resolved.
      // InvestmentEvent creation synchronizes the principal total.
      if (contributionPlanId != null) {
        await this.contributionPlansService.advanceNextDueDate(contributionPlanId, transactionClient);
      }

      return {
        transaction,
        investmentEvent,
        message: 'Contribution recorded successfully',
      };
    }, { isolationLevel: 'Serializable' });
  }

  async recordWithdrawal(recordWithdrawalDto: RecordWithdrawalDto, userId: number) {
    return this.prisma.$transaction(async (transactionClient) => {
      const replay = await this.findRecordedActivity(recordWithdrawalDto, userId, transactionClient, true);
      if (replay) return replay;
      const investment = await this.assertOpenInvestment(recordWithdrawalDto.investmentId, userId, transactionClient);
      if (investment.accountId == null) {
        throw new BadRequestException('Investment must have a linked account before recording a withdrawal.');
      }
      await this.assertMatchingAccountCurrency(investment.accountId, investment.currency, userId, transactionClient);
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
        transactionClient,
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
          meta: { linkedTransactionId: transaction.id, ...(recordWithdrawalDto.requestId ? { requestId: recordWithdrawalDto.requestId } : {}) },
        },
        userId,
        transactionClient,
      );

      return { transaction, investmentEvent, message: 'Withdrawal recorded successfully' };
    }, { isolationLevel: 'Serializable' });
  }

  private async findRecordedActivity(
    request: RecordContributionDto | RecordWithdrawalDto,
    userId: number,
    transactionClient: Prisma.TransactionClient,
    withdrawal: boolean,
  ) {
    if (!request.requestId) return null;
    const event = await transactionClient.investmentEvent.findFirst({
      where: { investment: { userId }, meta: { path: ['requestId'], equals: request.requestId } },
    });
    if (!event) return null;
    const sameOperation = withdrawal
      ? event.eventType === InvestmentEventType.WITHDRAWAL_PRINCIPAL
      : event.eventType === InvestmentEventType.CONTRIBUTION || event.eventType === InvestmentEventType.PREMIUM;
    const requestedPlanId = 'contributionPlanId' in request ? request.contributionPlanId : undefined;
    if (!sameOperation || event.investmentId !== Number(request.investmentId)
      || (requestedPlanId != null && event.recurringPlanId !== Number(requestedPlanId))
      || event.amount?.toNumber() !== Number(request.amount)
      || event.eventDate.toISOString().slice(0, 10) !== request.transactionDate.slice(0, 10)) {
      throw new ConflictException('This request ID has already been used for different investment activity.');
    }
    const transaction = event.linkedTransactionId == null ? null
      : await transactionClient.transaction.findFirst({ where: { id: event.linkedTransactionId, userId } });
    if (!transaction) throw new ConflictException('Recorded activity is missing its linked cash transaction.');
    return {
      transaction,
      investmentEvent: {
        ...event,
        amount: event.amount?.toNumber() ?? null,
        pricePerUnit: event.pricePerUnit?.toNumber() ?? null,
        netAmount: event.netAmount?.toNumber() ?? null,
      },
      message: withdrawal ? 'Withdrawal recorded successfully' : 'Contribution recorded successfully',
    };
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

  private async ensureOwnedInvestment(investmentId: string, userId: number, transaction?: Prisma.TransactionClient) {
    if (transaction) {
      const investment = await transaction.investment.findFirst({
        where: { id: Number(investmentId), userId },
        include: { assetTypeRef: true, assetCategoryRef: true },
      });
      if (!investment) {
        throw new BadRequestException(`Invalid investmentId ${investmentId}. Investment does not exist for this user.`);
      }
      return {
        ...investment,
        accountingTreatment: investment.accountingTreatmentOverride
          ?? investment.assetCategoryRef?.accountingTreatment
          ?? investment.assetTypeRef?.accountingTreatment
          ?? 'INVESTMENT',
      };
    }
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) {
      throw new BadRequestException(
        `Invalid investmentId ${investmentId}. Investment does not exist for this user.`,
      );
    }

    return investment;
  }

  private async assertOpenInvestment(investmentId: string, userId: number, transaction?: Prisma.TransactionClient) {
    const investment = await this.ensureOwnedInvestment(investmentId, userId, transaction);
    if (String(investment.status || '').trim().toLowerCase() === 'closed') {
      throw new BadRequestException('Closed investments cannot be modified.');
    }
    return investment;
  }

  private async assertMatchingAccountCurrency(accountId: number, currency: string, userId: number, transaction: Prisma.TransactionClient) {
    const account = await transaction.financialAccount.findFirst({ where: { id: accountId, userId } });
    if (!account || account.currency.toUpperCase() !== currency.toUpperCase()) {
      throw new BadRequestException('The linked account must belong to you and use the investment currency.');
    }
  }

  private async assertOpenLinkedInvestment(
    transaction: { investment?: { id: number } | null },
    userId: number,
  ) {
    if (transaction.investment?.id == null) return;
    await this.assertOpenInvestment(String(transaction.investment.id), userId);
    throw new BadRequestException(
      'Transactions linked to investment activity cannot be edited or deleted independently.',
    );
  }

  private async validateSourceAccountBalance(
    createTransactionDto: Pick<CreateTransactionDto, 'type' | 'amount' | 'sourceAccountId'>,
    userId: number,
    excludeTransactionId?: number,
  ): Promise<void> {
    if (createTransactionDto.type !== 'EXPENSE' && createTransactionDto.type !== 'INVESTMENT') return;

    const sourceAccountId = Number(createTransactionDto.sourceAccountId);
    if (!Number.isFinite(sourceAccountId) || sourceAccountId <= 0) return;

    const account = await this.financialAccountsService.findOne(sourceAccountId, userId);
    if (!account) return;

    let availableBalance = account.currentBalance;
    if (excludeTransactionId) {
      const excluded = await this.repository.findOne(excludeTransactionId, userId);
      if (
        excluded &&
        Number(excluded.sourceAccountId) === sourceAccountId &&
        (excluded.type === 'EXPENSE' || excluded.type === 'INVESTMENT')
      ) {
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
