import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { CreateInvestmentContributionPlanDto } from './dto/create-investment-contribution-plan.dto';
import { UpdateInvestmentContributionPlanDto } from './dto/update-investment-contribution-plan.dto';
import { ConfirmRecurringContributionPlanDto } from './dto/confirm-recurring-contribution-plan.dto';
import { PreviewRecurringContributionPlanDto } from './dto/preview-recurring-contribution-plan.dto';
import { SkipCurrentContributionDto } from './dto/skip-current-contribution.dto';
import type {
  InvestmentContributionPlanRecord,
  PreviewOpeningBalanceOccurrence,
  RecurringPlanLike,
} from './investment-contribution-plan.types';
import { ContributionPlanRepository } from './repositories/contribution-plan.repository';
import {
  RecurringCadenceUnit,
  RecurringScheduleCalculator,
} from './recurring-schedule-calculator.service';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { FinancialAccountsService } from '../financial-accounts/financial-accounts.service';

@Injectable()
export class InvestmentContributionPlansService {
  private readonly writableStatuses = new Set(['active', 'paused']);

  constructor(
    private readonly repository: ContributionPlanRepository,
    private readonly scheduleCalculator: RecurringScheduleCalculator,
    private readonly investmentRepository: InvestmentRepository,
    private readonly financialAccountsService: FinancialAccountsService,
  ) {}

  private normalizePlanStatus(status: string | null | undefined) {
    return String(status || 'active').trim().toLowerCase();
  }

  private getEffectiveAnchorDate(
    anchorDate: string | undefined,
    fallbackPlan?: InvestmentContributionPlanRecord | null,
  ) {
    if (anchorDate !== undefined) {
      return anchorDate;
    }

    if (!fallbackPlan?.anchorDate) {
      return undefined;
    }

    return this.toDateOnlyString(this.toUtcDateOnly(fallbackPlan.anchorDate));
  }

  private getEffectiveEndDate(
    endDate: string | undefined,
    fallbackPlan?: InvestmentContributionPlanRecord | null,
  ) {
    if (endDate !== undefined) {
      return endDate;
    }

    if (!fallbackPlan?.endDate) {
      return undefined;
    }

    return this.toDateOnlyString(this.toUtcDateOnly(fallbackPlan.endDate));
  }

  private validatePlanMutationInput(
    input: Partial<CreateInvestmentContributionPlanDto>,
    fallbackPlan?: InvestmentContributionPlanRecord | null,
  ) {
    if (input.amount !== undefined && Number(input.amount) <= 0) {
      throw new BadRequestException('Contribution amount must be greater than 0');
    }

    if (
      input.cadenceInterval !== undefined &&
      (!Number.isInteger(Number(input.cadenceInterval)) || Number(input.cadenceInterval) < 1)
    ) {
      throw new BadRequestException('cadenceInterval must be a positive integer');
    }

    if (input.cadenceUnit !== undefined) {
      this.toCadenceUnit(String(input.cadenceUnit));
    }

    if (input.status !== undefined) {
      const normalizedStatus = this.normalizePlanStatus(input.status);
      if (!this.writableStatuses.has(normalizedStatus)) {
        throw new BadRequestException('status must be either active or paused');
      }
    }

    const effectiveAnchorDate = this.getEffectiveAnchorDate(input.anchorDate, fallbackPlan);
    const effectiveEndDate = this.getEffectiveEndDate(input.endDate, fallbackPlan);
    if (effectiveAnchorDate) {
      this.validatePlanDates(effectiveAnchorDate, effectiveEndDate);
    }
  }

  private async assertNoConflictingActivePlan(investmentId: string, planIdToExclude?: string) {
    const existingActivePlan = await this.repository.findActiveByInvestment(investmentId);
    if (
      existingActivePlan &&
      String(existingActivePlan.id) !== String(planIdToExclude ?? '')
    ) {
      throw new ConflictException('An active recurring plan already exists for this investment');
    }
  }

  async create(createDto: CreateInvestmentContributionPlanDto, userId?: number) {
    if (userId !== undefined) {
      await this.assertOwnedInvestment(createDto.investmentId, userId);
      await this.assertOwnedSourceAccount(createDto.sourceAccountId, userId);
    }

    this.validatePlanMutationInput(createDto);
    if (this.normalizePlanStatus(createDto.status) === 'active') {
      await this.assertNoConflictingActivePlan(String(createDto.investmentId));
    }

    return this.repository.create(createDto);
  }

  async findAllByUser(userId: number) {
    return this.repository.findAllByUser(userId);
  }

  async findAllActiveByUser(userId: number) {
    return this.repository.findAllActiveByUser(userId);
  }

  async previewRecurringPlan(
    investmentId: string,
    dto: PreviewRecurringContributionPlanDto,
    userId?: number,
  ) {
    if (userId !== undefined) {
      await this.assertOwnedInvestment(investmentId, userId);
    }

    this.validatePlanDates(dto.anchorDate, dto.endDate);

    const today = this.toUtcDateOnly(new Date());
    const allDueDatesThroughToday = this.scheduleCalculator.calculateDueDates({
      anchorDate: dto.anchorDate,
      cadenceUnit: this.toCadenceUnit(dto.cadenceUnit),
      cadenceInterval: dto.cadenceInterval,
      cutoffDate: today,
      endDate: dto.endDate,
    });

    const nextDueDate = this.scheduleCalculator.firstDueDateOnOrAfter({
      anchorDate: dto.anchorDate,
      cadenceUnit: this.toCadenceUnit(dto.cadenceUnit),
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

      const occurrences: PreviewOpeningBalanceOccurrence[] = [];
      let sequenceNumber = 1;

      if (principalAmount > 0) {
        occurrences.push({
          sequenceNumber: sequenceNumber++,
          dueDate: this.toDateOnlyString(today),
          amount: principalAmount,
          selected: true,
          suggestedStatus: 'CONFIRMED',
          source: 'OPENING_BALANCE',
          eventType: InvestmentEventType.OPENING_BALANCE,
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
          eventType: InvestmentEventType.OPENING_INCOME_CREDIT,
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
    await this.assertOwnedInvestment(investmentId, userId);
    await this.assertOwnedSourceAccount(dto.sourceAccountId, userId);
    this.validatePlanDates(dto.anchorDate, dto.endDate);

    const today = this.toUtcDateOnly(new Date());
    const nextDueDate = this.scheduleCalculator.firstDueDateOnOrAfter({
      anchorDate: dto.anchorDate,
      cadenceUnit: this.toCadenceUnit(dto.cadenceUnit),
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
          eventType: InvestmentEventType.OPENING_BALANCE,
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
          eventType: InvestmentEventType.OPENING_INCOME_CREDIT,
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

  async findAllByInvestment(investmentId: string, userId?: number) {
    if (userId !== undefined) {
      await this.assertOwnedInvestment(investmentId, userId);
    }

    return this.repository.findAllByInvestment(investmentId);
  }

  async findOne(id: string, userId?: number) {
    const plan = await this.repository.findOne(id);
    if (!plan) return null;

    if (userId !== undefined) {
      await this.assertOwnedInvestment(String(plan.investmentId), userId);
    }

    return plan;
  }

  async update(id: string, updateDto: UpdateInvestmentContributionPlanDto, userId?: number) {
    const plan = await this.findOne(id, userId);
    if (!plan) return null;

    if (userId !== undefined) {
      const investmentId = String(updateDto.investmentId ?? plan.investmentId);
      await this.assertOwnedInvestment(investmentId, userId);
      await this.assertOwnedSourceAccount(updateDto.sourceAccountId, userId);
    }

    this.validatePlanMutationInput(updateDto, plan);

    const targetInvestmentId = String(updateDto.investmentId ?? plan.investmentId);
    const targetStatus =
      updateDto.status !== undefined
        ? this.normalizePlanStatus(updateDto.status)
        : this.normalizePlanStatus(plan.status);

    if (targetStatus === 'active') {
      await this.assertNoConflictingActivePlan(targetInvestmentId, id);
    }

    return this.repository.update(id, updateDto);
  }

  async remove(id: string, userId?: number) {
    if (userId !== undefined) {
      const plan = await this.findOne(id, userId);
      if (!plan) return;
    }

    return this.repository.delete(id);
  }

  async skipCurrentContribution(
    investmentId: string,
    planId: string,
    userId: number,
    dto: SkipCurrentContributionDto,
  ) {
    await this.assertOwnedInvestment(investmentId, userId);

    const plan = await this.repository.findOne(planId);
    if (!plan || String(plan.investmentId) !== String(investmentId)) {
      throw new NotFoundException('Recurring plan not found');
    }

    await this.assertOwnedSourceAccount(plan.sourceAccountId, userId);

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

    if (this.normalizePlanStatus(plan.status) !== 'active') {
      throw new BadRequestException('Paused recurring plans cannot advance due dates');
    }

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

  private async assertOwnedInvestment(investmentId: string, userId: number) {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) {
      throw new NotFoundException(`Investment ${investmentId} not found`);
    }

    return investment;
  }

  private async assertOwnedSourceAccount(
    sourceAccountId: string | number | null | undefined,
    userId: number,
  ) {
    if (sourceAccountId === undefined || sourceAccountId === null || sourceAccountId === '') {
      return null;
    }

    const account = await this.financialAccountsService.findOne(Number(sourceAccountId), userId);
    if (!account) {
      throw new NotFoundException(`Financial account ${sourceAccountId} not found`);
    }

    return account;
  }

  private toCadenceUnit(value: string): RecurringCadenceUnit {
    if (
      value === 'day' ||
      value === 'week' ||
      value === 'month' ||
      value === 'quarter' ||
      value === 'year'
    ) {
      return value;
    }

    throw new BadRequestException(`Unsupported cadenceUnit: ${value}`);
  }

  private calculateNextDueDate(plan: RecurringPlanLike): string | null {
    if (!plan.nextDueDate) return null;

    const nextDueDate = this.scheduleCalculator.firstDueDateOnOrAfter({
      anchorDate: this.toDateOnlyString(this.toUtcDateOnly(plan.anchorDate)),
      cadenceUnit: this.toCadenceUnit(plan.cadenceUnit),
      cadenceInterval: Number(plan.cadenceInterval) || 1,
      referenceDate: this.toDateOnlyString(
        this.toUtcDateOnly(new Date(new Date(plan.nextDueDate).getTime() + 24 * 60 * 60 * 1000)),
      ),
    });

    return nextDueDate ? this.toDateOnlyString(nextDueDate) : null;
  }
}