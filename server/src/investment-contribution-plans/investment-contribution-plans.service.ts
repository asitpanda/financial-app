import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateInvestmentContributionPlanDto } from './dto/create-investment-contribution-plan.dto';
import { UpdateInvestmentContributionPlanDto } from './dto/update-investment-contribution-plan.dto';
import { ConfirmRecurringContributionPlanDto } from './dto/confirm-recurring-contribution-plan.dto';
import { PreviewRecurringContributionPlanDto } from './dto/preview-recurring-contribution-plan.dto';
import { SkipCurrentContributionDto } from './dto/skip-current-contribution.dto';
import { ContributionPlanRepository } from './repositories/contribution-plan.repository';
import { RecurringScheduleCalculator } from './recurring-schedule-calculator.service';

@Injectable()
export class InvestmentContributionPlansService {
  constructor(
    private readonly repository: ContributionPlanRepository,
    private readonly scheduleCalculator: RecurringScheduleCalculator,
  ) {}

  async create(createDto: CreateInvestmentContributionPlanDto) {
    return this.repository.create(createDto);
  }

  async previewRecurringPlan(
    investmentId: string,
    dto: PreviewRecurringContributionPlanDto,
  ) {
    this.validatePlanDates(dto.anchorDate, dto.endDate);

    const today = this.toUtcDateOnly(new Date());
    const allDueDatesThroughToday = this.scheduleCalculator.calculateDueDates({
      anchorDate: dto.anchorDate,
      cadenceUnit: dto.cadenceUnit as any,
      cadenceInterval: dto.cadenceInterval,
      cutoffDate: today,
      endDate: dto.endDate,
    });

    const nextDueDate = this.scheduleCalculator.firstDueDateOnOrAfter({
      anchorDate: dto.anchorDate,
      cadenceUnit: dto.cadenceUnit as any,
      cadenceInterval: dto.cadenceInterval,
      referenceDate: today,
      endDate: dto.endDate,
    });

    if (dto.historicalImportMode === 'TRACK_FROM_TODAY') {
      return {
        investmentId,
        historicalImportMode: dto.historicalImportMode,
        historicalOccurrenceCount: 0,
        expectedHistoricalTotal: 0,
        nextDueDate,
        occurrences: [],
      };
    }

    if (dto.historicalImportMode === 'OPENING_BALANCE') {
      const principalAmount = Number(dto.openingPrincipalAmount || 0);
      const incomeAmount = Number(dto.openingIncomeAmount || 0);

      const occurrences = [] as any[];
      let sequenceNumber = 1;

      if (principalAmount > 0) {
        occurrences.push({
          sequenceNumber: sequenceNumber++,
          dueDate: this.toDateOnlyString(today),
          amount: principalAmount,
          selected: true,
          suggestedStatus: 'CONFIRMED',
          source: 'OPENING_BALANCE',
          eventType: 'OPENING_BALANCE',
        });
      }

      if (incomeAmount > 0) {
        occurrences.push({
          sequenceNumber: sequenceNumber++,
          dueDate: this.toDateOnlyString(today),
          amount: incomeAmount,
          selected: true,
          suggestedStatus: 'CONFIRMED',
          source: 'OPENING_BALANCE',
          eventType: 'OPENING_INCOME_CREDIT',
        });
      }

      return {
        investmentId,
        historicalImportMode: dto.historicalImportMode,
        historicalOccurrenceCount: occurrences.length,
        expectedHistoricalTotal: occurrences.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        ),
        nextDueDate,
        occurrences,
      };
    }

    // Only OPENING_BALANCE and TRACK_FROM_TODAY are supported modes.
    throw new BadRequestException(
      `Unsupported historicalImportMode: ${dto.historicalImportMode}`,
    );
  }

  async confirmRecurringPlan(
    investmentId: string,
    dto: ConfirmRecurringContributionPlanDto,
    userId: number,
  ) {
    this.validatePlanDates(dto.anchorDate, dto.endDate);

    const today = this.toUtcDateOnly(new Date());
    const nextDueDate = this.scheduleCalculator.firstDueDateOnOrAfter({
      anchorDate: dto.anchorDate,
      cadenceUnit: dto.cadenceUnit as any,
      cadenceInterval: dto.cadenceInterval,
      referenceDate: today,
      endDate: dto.endDate,
    });

    const planPayload = {
      ...dto,
      investmentId,
      nextDueDate,
      status: 'active',
      historicalImportMode: dto.historicalImportMode,
    };

    const selectedHistoricalItems = (dto.reviewedHistoricalItems || []).filter(
      (item) => item.selected,
    );

    // GENERATE_ALL mode removed — clients should supply reviewedHistoricalItems when necessary.

    if (dto.historicalImportMode !== 'OPENING_BALANCE') {
      const anchor = this.toUtcDateOnly(dto.anchorDate);
      const endDate = dto.endDate ? this.toUtcDateOnly(dto.endDate) : null;
      for (const item of selectedHistoricalItems) {
        const dueDate = this.toUtcDateOnly(item.dueDate);
        if (dueDate < anchor) {
          throw new BadRequestException(
            `Historical dueDate ${item.dueDate} is before anchorDate`,
          );
        }
        if (endDate && dueDate > endDate) {
          throw new BadRequestException(
            `Historical dueDate ${item.dueDate} is after endDate`,
          );
        }
      }
    }

    if (
      dto.historicalImportMode === 'OPENING_BALANCE' &&
      selectedHistoricalItems.length === 0
    ) {
      const principalAmount = Number(dto.openingPrincipalAmount || 0);
      const incomeAmount = Number(dto.openingIncomeAmount || 0);
      if (principalAmount <= 0 && incomeAmount <= 0) {
        throw new BadRequestException(
          'OPENING_BALANCE requires opening principal and/or opening income amount',
        );
      }

      const openingDate = this.toDateOnlyString(today);
      if (principalAmount > 0) {
        selectedHistoricalItems.push({
          dueDate: openingDate,
          eventDate: openingDate,
          amount: principalAmount,
          selected: true,
          status: 'CONFIRMED',
          eventType: 'OPENING_BALANCE',
          notes: 'Opening principal import',
        });
      }
      if (incomeAmount > 0) {
        selectedHistoricalItems.push({
          dueDate: openingDate,
          eventDate: openingDate,
          amount: incomeAmount,
          selected: true,
          status: 'CONFIRMED',
          eventType: 'OPENING_INCOME_CREDIT',
          notes: 'Opening historical income import',
        });
      }
    }

    let result;
    try {
      result = await this.repository.createPlanWithHistoricalEvents({
        investmentId,
        userId,
        planPayload,
        selectedHistoricalItems,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('already exists') || message.includes('Duplicate recurring event')) {
        throw new ConflictException(message);
      }

      if (message.includes('not found') || message.includes('ownership mismatch')) {
        throw new NotFoundException(message);
      }

      throw new InternalServerErrorException('Failed to confirm recurring plan');
    }

    return {
      ...result,
      nextDueDate,
    };
  }

  async findAllByInvestment(investmentId: string) {
    return this.repository.findAllByInvestment(investmentId);
  }

  async findOne(id: string) {
    return this.repository.findOne(id);
  }

  async update(id: string, updateDto: UpdateInvestmentContributionPlanDto) {
    return this.repository.update(id, updateDto);
  }

  async remove(id: string) {
    return this.repository.delete(id);
  }

  async skipCurrentContribution(
    investmentId: string,
    planId: string,
    userId: number,
    dto: SkipCurrentContributionDto,
  ) {
    const plan = await this.repository.findOne(planId);
    if (!plan || String(plan.investmentId) !== String(investmentId)) {
      throw new NotFoundException('Recurring plan not found');
    }

    if (!plan.nextDueDate) {
      throw new BadRequestException('Recurring plan does not have a due contribution to skip');
    }

    const nextDueDate = this.calculateNextDueDate(plan);

    try {
      return await this.repository.skipCurrentContribution({
        investmentId,
        planId,
        userId,
        dueDate: this.toDateOnlyString(this.toUtcDateOnly(plan.nextDueDate)),
        nextDueDate,
        notes: dto.notes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }

  async advanceNextDueDate(id: number) {
    // Get the current plan
    const plan = await this.repository.findOne(String(id));
    if (!plan) return null;

    // Update the plan
    const updateDto: UpdateInvestmentContributionPlanDto = {
      nextDueDate: this.calculateNextDueDate(plan),
    };

    return this.repository.update(String(id), updateDto);
  }

  async generateDueRecurringInvestmentEvents(cutoffDate: Date) {
    return this.repository.generateDueRecurringInvestmentEvents({ cutoffDate });
  }

  private validatePlanDates(anchorDate: string, endDate?: string) {
    const anchor = new Date(anchorDate);
    if (Number.isNaN(anchor.getTime())) {
      throw new BadRequestException('Invalid anchorDate');
    }

    if (!endDate) return;
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid endDate');
    }

    if (end < anchor) {
      throw new BadRequestException('endDate cannot be earlier than anchorDate');
    }
  }

  private toUtcDateOnly(value: string | Date): Date {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private toDateOnlyString(value: Date): string {
    return value.toISOString().split('T')[0];
  }

  private calculateNextDueDate(plan: {
    nextDueDate?: string | Date | null;
    anchorDate: string | Date;
    cadenceUnit: string;
    cadenceInterval: number;
  }): string | null {
    if (!plan.nextDueDate) return null;

    const nextDueDate = this.scheduleCalculator.firstDueDateOnOrAfter({
      anchorDate: this.toDateOnlyString(this.toUtcDateOnly(plan.anchorDate)),
      cadenceUnit: plan.cadenceUnit as any,
      cadenceInterval: Number(plan.cadenceInterval) || 1,
      referenceDate: this.toDateOnlyString(
        this.toUtcDateOnly(new Date(new Date(plan.nextDueDate).getTime() + 24 * 60 * 60 * 1000)),
      ),
    });

    return nextDueDate ? this.toDateOnlyString(nextDueDate) : null;
  }
}