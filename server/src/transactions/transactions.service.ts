import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITransactionRepository } from './repositories/transaction.repository.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RecordContributionDto } from './dto/record-contribution.dto';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { mockBanksData } from '../mockdata';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('TRANSACTION_REPOSITORY')
    private readonly repository: ITransactionRepository,
    private readonly configService: ConfigService,
    private readonly investmentEventsService: InvestmentEventsService,
    private readonly contributionPlansService: InvestmentContributionPlansService,
  ) {}

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(id, userId);
  }

  async create(createTransactionDto: CreateTransactionDto, userId: number) {
    return this.repository.create(createTransactionDto, userId);
  }

  async update(
    id: number,
    updateTransactionDto: UpdateTransactionDto,
    userId: number,
  ) {
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

  async getSources() {
    return mockBanksData;
  }

  async recordContribution(recordContributionDto: RecordContributionDto, userId: number) {
    // 1. Create Transaction
    const transactionDto: CreateTransactionDto = {
      type: 'expense',
      transactionKind: 'investment-contribution',
      categoryId: 23, // "Investment Contribution" category (we'll add this)
      goalId: null,
      sourceAccountId: Number(recordContributionDto.sourceAccountId),
      destinationAccountId: null,
      amount: recordContributionDto.amount,
      categoryLabelSnapshot: 'Investment Contribution',
      date: recordContributionDto.transactionDate,
      notes: recordContributionDto.notes || `Contribution for investment ${recordContributionDto.investmentId}`,
    };

    const transaction = await this.repository.create(transactionDto, userId);

    // 2. Create InvestmentEvent
    const investmentEventDto = {
      investmentId: String(recordContributionDto.investmentId),
      sourceAccountId: String(recordContributionDto.sourceAccountId),
      linkedTransactionId: transaction.id,
      eventType: 'contribution',
      eventDate: recordContributionDto.transactionDate,
      amount: recordContributionDto.amount,
      units: null,
      pricePerUnit: null,
      netAmount: recordContributionDto.amount,
      notes: `Linked to transaction ${transaction.id}`,
      meta: { linkedTransactionId: transaction.id },
    };

    const investmentEvent = await this.investmentEventsService.create(investmentEventDto);

    // 3. Link them by updating transaction
    await this.repository.update(transaction.id, { linkedInvestmentEventId: investmentEvent.id }, userId);

    // 4. Update ContributionPlan's nextDueDate
    await this.contributionPlansService.advanceNextDueDate(Number(recordContributionDto.contributionPlanId));

    return {
      transaction,
      investmentEvent,
      message: 'Contribution recorded successfully',
    };
  }
}
