import { Injectable, BadRequestException } from '@nestjs/common';
import {
  InvestmentEventSource,
  InvestmentEventStatus,
  InvestmentEventType,
} from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { CategoriesService } from '../categories/categories.service';
import { mockFinancialAccountsData } from '../mockdata';
import { TransactionRepository } from './repositories/transaction.repository';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { FinancialAccountsService } from '../financial-accounts/financial-accounts.service';

@Injectable()
export class TransactionsService {
  private static readonly CONTRIBUTION_CATEGORY_NAME = 'Investment Contribution';

  constructor(
    private readonly repository: TransactionRepository,
    private readonly investmentEventsService: InvestmentEventsService,
    private readonly contributionPlansService: InvestmentContributionPlansService,
    private readonly categoriesService: CategoriesService,
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

  async findByType(userId: number, type: string) {
    return this.repository.findByType(userId, type);
  }

  async recordContribution(recordContributionDto: RecordContributionDto, userId: number) {
    await this.ensureOwnedInvestment(recordContributionDto.investmentId, userId);
    const sourceAccountId = this.resolveSourceAccountId(recordContributionDto.sourceAccountId);
    await this.ensureOwnedSourceAccount(sourceAccountId, userId);
    const contributionPlanId = await this.resolveContributionPlanId(recordContributionDto, userId);
    const contributionCategoryId = await this.resolveContributionCategoryId(userId);

    // 1. Create Transaction
    const transactionDto: CreateTransactionDto = {
      type: 'expense',
      transactionKind: 'investment-contribution',
      categoryId: contributionCategoryId,
      goalId: null,
      sourceAccountId,
      destinationAccountId: null,
      amount: recordContributionDto.amount,
      categoryLabelSnapshot: TransactionsService.CONTRIBUTION_CATEGORY_NAME,
      date: recordContributionDto.transactionDate,
      notes: recordContributionDto.notes || `Contribution for investment ${recordContributionDto.investmentId}`,
    };

    await this.validateExpenseSourceBalance(transactionDto, userId);

    const transaction = await this.repository.create(transactionDto, userId);

    // 2. Create InvestmentEvent
    const investmentEventDto = {
      investmentId: String(recordContributionDto.investmentId),
      sourceAccountId: String(sourceAccountId),
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

    // 3. Link them by updating transaction
    await this.repository.update(transaction.id, { linkedInvestmentEventId: investmentEvent.id }, userId);

    // 4. Update ContributionPlan's nextDueDate
    await this.contributionPlansService.advanceNextDueDate(contributionPlanId);

    return {
      transaction,
      investmentEvent,
      message: 'Contribution recorded successfully',
    };
  }

  private resolveSourceAccountId(rawSource: string): number {
    const trimmedSource = String(rawSource || '').trim();
    const numericSourceId = Number(trimmedSource);
    if (!Number.isNaN(numericSourceId) && numericSourceId > 0) {
      return numericSourceId;
    }

    const normalizedSource = trimmedSource.toLowerCase();
    const matchedAccount = mockFinancialAccountsData.find((account) => {
      const candidates = [account.institutionName, account.displayName, account.name]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return candidates.includes(normalizedSource);
    });

    if (!matchedAccount) {
      throw new BadRequestException(
        'Invalid sourceAccountId. Pass a numeric account id or a valid bank/account name.',
      );
    }

    return matchedAccount.id;
  }

  private async resolveContributionPlanId(
    recordContributionDto: RecordContributionDto,
    userId: number,
  ): Promise<number> {
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

    if (!activePlan) {
      throw new BadRequestException(
        `No active contribution plan found for investmentId ${recordContributionDto.investmentId}`,
      );
    }

    return Number(activePlan.id);
  }

  private async ensureOwnedInvestment(investmentId: string, userId: number): Promise<void> {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) {
      throw new BadRequestException(
        `Invalid investmentId ${investmentId}. Investment does not exist for this user.`,
      );
    }
  }

  private async ensureOwnedSourceAccount(sourceAccountId: number, userId: number): Promise<void> {
    const account = await this.financialAccountsService.findOne(sourceAccountId, userId);
    if (!account) {
      throw new BadRequestException(
        `Invalid sourceAccountId ${sourceAccountId}. Account does not exist for this user.`,
      );
    }
  }

  private async resolveContributionCategoryId(userId: number): Promise<number> {
    const categories = await this.categoriesService.findAll(userId);
    const existingCategory = categories.find((category) =>
      String(category?.name || '').trim().toLowerCase() ===
      TransactionsService.CONTRIBUTION_CATEGORY_NAME.toLowerCase(),
    );

    if (existingCategory) {
      return Number(existingCategory.id);
    }

    const createdCategory = await this.categoriesService.create(
      {
        name: TransactionsService.CONTRIBUTION_CATEGORY_NAME,
        type: 'expense',
        icon: 'chart-line',
        color: '#8B5CF6',
      },
      userId,
    );

    return Number(createdCategory.id);
  }

  private async validateExpenseSourceBalance(
    createTransactionDto: Pick<CreateTransactionDto, 'type' | 'amount' | 'sourceAccountId'>,
    userId: number,
    excludeTransactionId?: number,
  ): Promise<void> {
    if (createTransactionDto.type !== 'expense') return;

    const sourceAccountId = Number(createTransactionDto.sourceAccountId);
    if (!Number.isFinite(sourceAccountId) || sourceAccountId <= 0) return;

    const accountTransactions = (await this.repository.findAll(userId)).filter(
      (transaction) =>
        Number(transaction.sourceAccountId) === sourceAccountId &&
        (!excludeTransactionId || Number(transaction.id) !== excludeTransactionId),
    );

    const availableBalance = accountTransactions.reduce((sum, transaction) => {
      const amount = Number(transaction.amount || 0);
      return transaction.type === 'income' ? sum + amount : sum - amount;
    }, 0);

    const requestedAmount = Number(createTransactionDto.amount || 0);
    if (requestedAmount <= 0) return;

    if (requestedAmount > availableBalance) {
      throw new BadRequestException(
        `Insufficient balance in source account. Available: ${availableBalance.toFixed(2)}, requested: ${requestedAmount.toFixed(2)}.`,
      );
    }
  }
}
