import { BadRequestException, Injectable } from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { ValuationSnapshotsService } from '../valuation-snapshots/valuation-snapshots.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import {
  InvestmentDashboardCategoryPerformanceRowDto,
  InvestmentDashboardSummaryDto,
  InvestmentValueSourceSummaryDto,
} from './dto/dashboard-analytics-response.dto';
import {
  InvestmentActiveContributionPlanResponseDto,
  InvestmentDetailResponseDto,
  InvestmentLatestSnapshotResponseDto,
} from './dto/investment-detail-response.dto';
import { InvestmentPerformanceResponseDto } from './dto/investment-performance-response.dto';
import type {
  ActivePlanLike,
  EventLike,
  InvestmentCrudRuleInput,
  InvestmentLike,
  ResolvedAnalyticsRecord,
  SnapshotLike,
  SummaryInvestment,
  TimeSeriesPoint,
  AccountingTreatment,
} from './investment.types';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentRepository } from './repositories/investment.repository';
import { AssetTaxonomyRepository } from '../investment-asset-taxonomy/repositories/asset-taxonomy.repository';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsEngineService } from './analytics/analytics-engine.service';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly repository: InvestmentRepository,
    private readonly assetTaxonomyRepository: AssetTaxonomyRepository,
    private readonly contributionPlansService: InvestmentContributionPlansService,
    private readonly investmentEventsService: InvestmentEventsService,
    private readonly valuationSnapshotsService: ValuationSnapshotsService,
    private readonly prisma: PrismaService,
    private readonly analyticsEngine: AnalyticsEngineService,
  ) {}

  private get appMetaConfigRefDelegate() {
    return (this.prisma as any).appMetaConfigRef;
  }

  private async getInvestmentAssetTypeConfigByCode(assetType: string | null | undefined) {
    const normalizedAssetType = String(assetType || '').trim().toUpperCase();
    if (!normalizedAssetType) return null;

    const assetTypeMeta = await this.appMetaConfigRefDelegate.findFirst({
      where: {
        module: 'INVESTMENT',
        configType: 'ASSET_TYPE',
        code: normalizedAssetType,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!assetTypeMeta) return null;

    const categories = await this.appMetaConfigRefDelegate.findMany({
      where: {
        module: 'INVESTMENT',
        configType: 'ASSET_CATEGORY',
        parentId: assetTypeMeta.id,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return {
      id: assetTypeMeta.id,
      code: assetTypeMeta.code,
      label: assetTypeMeta.label,
      accountingTreatment: assetTypeMeta.accountingTreatment ?? null,
      categories: categories.map((category) => ({
        id: category.id,
        code: category.code,
        label: category.label,
        accountingTreatment: category.accountingTreatment ?? null,
      })),
    };
  }

  private async isValidInvestmentClassification(
    assetType: string | null | undefined,
    assetCategory: string | null | undefined,
  ) {
    const typeConfig = await this.getInvestmentAssetTypeConfigByCode(assetType);
    if (!typeConfig) return false;

    const normalizedAssetCategory = String(assetCategory || '').trim().toUpperCase();
    return typeConfig.categories.some((categoryConfig) => categoryConfig.code === normalizedAssetCategory);
  }

  private async getInvestmentAssetTypeConfigsFromDb() {
    const typeRows = await this.appMetaConfigRefDelegate.findMany({
      where: {
        module: 'INVESTMENT',
        configType: 'ASSET_TYPE',
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    const categoryRows = await this.appMetaConfigRefDelegate.findMany({
      where: {
        module: 'INVESTMENT',
        configType: 'ASSET_CATEGORY',
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return typeRows.map((typeRow) => ({
      id: typeRow.id,
      code: typeRow.code,
      label: typeRow.label,
      accountingTreatment: typeRow.accountingTreatment ?? null,
      categories: categoryRows
        .filter((categoryRow) => categoryRow.parentId === typeRow.id)
        .map((categoryRow) => ({
          id: categoryRow.id,
          code: categoryRow.code,
          label: categoryRow.label,
          accountingTreatment: categoryRow.accountingTreatment ?? null,
        })),
    }));
  }

  private async assertInvestmentCrudRules(investment: InvestmentCrudRuleInput) {
    if (investment.accountId == null || Number(investment.accountId) < 1) {
      throw new BadRequestException({
        message: 'Account is required',
        field: 'accountId',
      });
    }

    if (!String(investment.name || '').trim()) {
      throw new BadRequestException({
        message: 'Investment name is required',
        field: 'name',
      });
    }

    if (!String(investment.assetType || '').trim()) {
      throw new BadRequestException({
        message: 'Investment type is required',
        field: 'assetType',
      });
    }

    if (!String(investment.assetCategory || '').trim()) {
      throw new BadRequestException({
        message: 'Investment category is required',
        field: 'assetCategory',
      });
    }

    const assetTypeConfig = await this.getInvestmentAssetTypeConfigByCode(investment.assetType);
    if (!assetTypeConfig) {
      throw new BadRequestException({
        message: 'Unsupported investment type',
        field: 'assetType',
      });
    }

    if (!(await this.isValidInvestmentClassification(investment.assetType, investment.assetCategory))) {
      throw new BadRequestException({
        message: 'Investment category is not valid for the selected type',
        field: 'assetCategory',
      });
    }

    if (!String(investment.institutionName || '').trim()) {
      throw new BadRequestException({
        message: 'Institution is required',
        field: 'institutionName',
      });
    }

    if (!investment.startDate || Number.isNaN(new Date(investment.startDate).getTime())) {
      throw new BadRequestException({
        message: 'Start date is required',
        field: 'startDate',
      });
    }

    if (
      investment.maturityDate &&
      !Number.isNaN(new Date(investment.maturityDate).getTime()) &&
      new Date(investment.maturityDate).getTime() < new Date(investment.startDate).getTime()
    ) {
      throw new BadRequestException({
        message: 'Maturity date cannot be before start date',
        field: 'maturityDate',
      });
    }

    const numericChecks = [
      ['totalInvested', investment.totalInvested, 'Total invested cannot be negative'],
      ['currentValue', investment.currentValue, 'Current value cannot be negative'],
      ['insuranceCover', investment.insuranceCover, 'Insurance cover cannot be negative'],
    ] as const;

    numericChecks.forEach(([field, value, message]) => {
      if (value != null && Number(value) < 0) {
        throw new BadRequestException({ message, field });
      }
    });
  }

  private async assertTaxonomyOwnership(
    assetTaxonomyId: string | number | null | undefined,
    userId: number,
  ) {
    if (assetTaxonomyId == null || assetTaxonomyId === '') {
      return;
    }

    const taxonomyNode = await this.assetTaxonomyRepository.findOne(Number(assetTaxonomyId), userId);
    if (!taxonomyNode) {
      throw new BadRequestException({
        message: 'Selected taxonomy bucket was not found for the current user',
        field: 'assetTaxonomyId',
      });
    }
  }

  async create(createInvestmentDto: CreateInvestmentDto, userId: number) {
    await this.assertInvestmentCrudRules(createInvestmentDto);
    await this.assertTaxonomyOwnership(createInvestmentDto.assetTaxonomyId, userId);
    const created = await this.repository.create(createInvestmentDto, userId);

    // Seed opening events so totalInvested/currentValue are event-sourced from day one.
    // Recurring plans seed their own opening events via contribution-plan confirm, so skip here.
    if (String(createInvestmentDto.contributionMode || '').toUpperCase() === 'ONE_TIME') {
      const openingPrincipal = Number(createInvestmentDto.totalInvested || 0);
      const openingIncome =
        Number(createInvestmentDto.currentValue ?? createInvestmentDto.totalInvested ?? 0) - openingPrincipal;
      const eventDate = createInvestmentDto.startDate;

      if (openingPrincipal > 0) {
        await this.investmentEventsService.create({
          investmentId: String(created.id),
          eventType: InvestmentEventType.OPENING_BALANCE,
          status: 'CONFIRMED',
          eventSource: 'MANUAL',
          eventDate,
          amount: openingPrincipal,
          netAmount: openingPrincipal,
        });
      }

      if (openingIncome > 0) {
        await this.investmentEventsService.create({
          investmentId: String(created.id),
          eventType: InvestmentEventType.OPENING_INCOME_CREDIT,
          status: 'CONFIRMED',
          eventSource: 'MANUAL',
          eventDate,
          amount: openingIncome,
          netAmount: openingIncome,
        });
      }
    }

    for (const benefit of createInvestmentDto.expectedBenefits ?? []) {
      await this.prisma.investmentBenefit.create({
        data: {
          investmentId: created.id,
          benefitType: benefit.benefitType,
          amount: benefit.amount,
          benefitDate: new Date(benefit.benefitDate),
          notes: benefit.notes,
        },
      });
    }

    return created;
  }

  async getMetadata() {
    return {
      asset_configs: await this.getInvestmentAssetTypeConfigsFromDb(),
    };
  }

  private getCategoryKey(investment: InvestmentLike) {
    return String(
      investment?.assetType || investment?.assetCategory || 'OTHER',
    );
  }

  private readonly monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  private readonly fiscalYearStartMonth = 3;

  private parseDate(value: string | Date | null | undefined) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private normalizeContributionPlanStatus(status: string | null | undefined) {
    return String(status || 'active').trim().toLowerCase();
  }

  private selectDisplayContributionPlan<
    T extends ActivePlanLike & {
      updatedAt?: string | Date | null;
      createdAt?: string | Date | null;
    },
  >(plans: T[] = []): T | null {
    if (plans.length === 0) {
      return null;
    }

    const getPriority = (plan: T) => {
      const normalizedStatus = this.normalizeContributionPlanStatus(plan.status);
      if (normalizedStatus === 'active') return 0;
      if (normalizedStatus === 'paused') return 1;
      return 2;
    };

    const getSortTime = (plan: T) => {
      return (
        this.parseDate(plan.updatedAt)?.getTime() ??
        this.parseDate(plan.createdAt)?.getTime() ??
        this.parseDate(plan.nextDueDate)?.getTime() ??
        0
      );
    };

    return [...plans].sort((left, right) => {
      const priorityDifference = getPriority(left) - getPriority(right);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const timeDifference = getSortTime(right) - getSortTime(left);
      if (timeDifference !== 0) {
        return timeDifference;
      }

      return String(right.id).localeCompare(String(left.id), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    })[0];
  }

  private startOfMonth(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  private endOfMonth(value: Date) {
    return new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  private addMonths(value: Date, monthOffset: number) {
    return new Date(value.getFullYear(), value.getMonth() + monthOffset, 1);
  }

  private diffMonths(left: Date, right: Date) {
    return (left.getFullYear() - right.getFullYear()) * 12 + (left.getMonth() - right.getMonth());
  }

  private formatMonthYear(value: Date) {
    return `${this.monthNames[value.getMonth()]} ${value.getFullYear()}`;
  }

  private getFiscalYearLabel(value: Date) {
    const year = value.getFullYear();
    const fiscalStartYear = value.getMonth() >= this.fiscalYearStartMonth ? year : year - 1;
    return `FY ${fiscalStartYear}-${String(fiscalStartYear + 1).slice(-2)}`;
  }

  private buildSnapshotsByInvestment(snapshots: SnapshotLike[] = []) {
    const snapshotsByInvestmentId = new Map<string, SnapshotLike[]>();

    snapshots.forEach((snapshot) => {
      const key = String(snapshot?.investmentId ?? '');
      if (!key) return;

      const existing = snapshotsByInvestmentId.get(key) ?? [];
      existing.push(snapshot);
      snapshotsByInvestmentId.set(key, existing);
    });

    snapshotsByInvestmentId.forEach((items, key) => {
      snapshotsByInvestmentId.set(
        key,
        items
          .filter((item) => this.parseDate(item?.snapshotDate))
          .sort(
            (left, right) =>
              this.parseDate(left.snapshotDate)!.getTime() -
              this.parseDate(right.snapshotDate)!.getTime(),
          ),
      );
    });

    return snapshotsByInvestmentId;
  }

  private getTimelineStartDate(investment: SummaryInvestment, snapshots: SnapshotLike[] = []) {
    const today = this.startOfMonth(new Date());
    const rawCandidates = [
      investment?.startDate,
      investment?.createdAt,
      investment?.lastValuationAt,
      investment?.activeContributionPlan?.anchorDate,
      ...snapshots.map((snapshot) => snapshot?.snapshotDate),
    ];

    const validCandidates = rawCandidates
      .map((value) => this.parseDate(value))
      .filter((value): value is Date => Boolean(value))
      .map((value) => this.startOfMonth(value));

    if (validCandidates.length === 0) {
      return today;
    }

    const nonFutureCandidates = validCandidates.filter(
      (value) => value.getTime() <= today.getTime(),
    );

    if (nonFutureCandidates.length === 0) {
      return today;
    }

    return nonFutureCandidates.reduce((earliest, value) =>
      value.getTime() < earliest.getTime() ? value : earliest,
    );
  }

  private resolveInvestmentValueAtDate(
    investment: SummaryInvestment,
    snapshots: SnapshotLike[] = [],
    pointDate: Date,
    events: EventLike[] = [],
  ) {
    const investedValue = Number(investment?.totalInvested || 0);

    const latestSnapshot = [...snapshots]
      .filter((snapshot) => {
        const snapshotDate = this.parseDate(snapshot?.snapshotDate);
        return snapshotDate && snapshotDate.getTime() <= pointDate.getTime();
      })
      .sort(
        (left, right) =>
          this.parseDate(right.snapshotDate)!.getTime() -
          this.parseDate(left.snapshotDate)!.getTime(),
      )[0];

    if (latestSnapshot) {
      return {
        value: Number(latestSnapshot.marketValue || investedValue),
        source: 'snapshot',
      };
    }

    const derivedValuation = this.buildDerivedEventValuation(
      events,
      investment?.accountingTreatment,
    );
    if (derivedValuation) {
      return {
        value: derivedValuation.currentValue,
        source: derivedValuation.currentValueSource ?? 'estimated',
      };
    }

    const lastValuationAt = this.parseDate(investment?.lastValuationAt);
    const currentValue = Number(investment?.currentValue ?? Number.NaN);

    if (
      lastValuationAt &&
      lastValuationAt.getTime() <= pointDate.getTime() &&
      Number.isFinite(currentValue)
    ) {
      return {
        value: currentValue,
        source: 'estimated',
      };
    }

    return {
      value: investedValue,
      source: 'invested',
    };
  }

  private buildResolvedAnalyticsRecord(
    investment: SummaryInvestment,
    snapshots: SnapshotLike[] = [],
    events: EventLike[] = [],
  ): ResolvedAnalyticsRecord {
    const resolvedCurrentValue = this.analyticsEngine.resolveInvestmentValueAtDate(
      investment,
      snapshots,
      new Date(),
      events,
    );
    const investedAmount = Number(investment?.totalInvested || 0);

    return {
      id: investment.id,
      investment,
      category: this.getCategoryKey(investment),
      accountingTreatment: investment.accountingTreatment ?? 'INVESTMENT',
      investedAmount,
      currentValue: resolvedCurrentValue.value,
      returnAmount: resolvedCurrentValue.value - investedAmount,
      timelineStartDate: this.getTimelineStartDate(investment, snapshots),
      snapshots,
    };
  }

  private buildPortfolioGrowthData(records: ResolvedAnalyticsRecord[]) {
    const datedRecords = records.filter((record) => record.timelineStartDate instanceof Date);

    if (datedRecords.length === 0) {
      return [];
    }

    const earliestStart = datedRecords.reduce(
      (earliest, entry) =>
        entry.timelineStartDate.getTime() < earliest.getTime()
          ? entry.timelineStartDate
          : earliest,
      datedRecords[0].timelineStartDate,
    );
    const today = new Date();
    const currentMonth = this.startOfMonth(today);
    const monthCount = this.diffMonths(currentMonth, earliestStart);

    return Array.from({ length: monthCount + 1 }, (_, monthOffset) => {
      const monthStart = this.addMonths(earliestStart, monthOffset);
      const monthEnd = this.endOfMonth(monthStart);
      const pointDate = monthEnd.getTime() > today.getTime() ? today : monthEnd;

      const point = datedRecords.reduce(
        (acc, entry) => {
          if (entry.timelineStartDate.getTime() > pointDate.getTime()) {
            return acc;
          }

          const resolvedValue = this.analyticsEngine.resolveInvestmentValueAtDate(
            entry.investment,
            entry.snapshots,
            pointDate,
          );

          acc.investedToDate += entry.investedAmount;
          acc.currentValueToDate += resolvedValue.value;

          if (resolvedValue.source === 'snapshot') {
            acc.snapshotBackedValue += resolvedValue.value;
          } else if (resolvedValue.source === 'estimated') {
            acc.estimatedValue += resolvedValue.value;
          } else {
            acc.investedOnlyValue += resolvedValue.value;
          }

          return acc;
        },
        {
          label: this.formatMonthYear(monthStart),
          investedToDate: 0,
          currentValueToDate: 0,
          returnToDate: 0,
          snapshotBackedValue: 0,
          estimatedValue: 0,
          investedOnlyValue: 0,
        },
      );

      point.returnToDate = point.currentValueToDate - point.investedToDate;
      return point;
    });
  }

  private buildYearlyTimeSeriesData(records: ResolvedAnalyticsRecord[]) {
    const yearGroups: Record<string, TimeSeriesPoint> = {};

    records.forEach((record) => {
      const startDate = record.timelineStartDate;
      if (!(startDate instanceof Date)) return;

      const fiscalYearLabel = this.getFiscalYearLabel(startDate);

      if (!yearGroups[fiscalYearLabel]) {
        yearGroups[fiscalYearLabel] = {
          label: fiscalYearLabel,
          invested: 0,
          return: 0,
          investedBreakdown: {},
          returnBreakdown: {},
        };
      }

      yearGroups[fiscalYearLabel].invested += record.investedAmount;
      yearGroups[fiscalYearLabel].return += record.returnAmount;
      yearGroups[fiscalYearLabel].investedBreakdown[record.category] =
        (yearGroups[fiscalYearLabel].investedBreakdown[record.category] || 0) +
        record.investedAmount;
      yearGroups[fiscalYearLabel].returnBreakdown[record.category] =
        (yearGroups[fiscalYearLabel].returnBreakdown[record.category] || 0) +
        record.returnAmount;
    });

    return Object.values(yearGroups).sort((left, right) => {
      const leftYear = Number(String(left.label).split(' ')[1]?.split('-')[0] || 0);
      const rightYear = Number(String(right.label).split(' ')[1]?.split('-')[0] || 0);
      return leftYear - rightYear;
    });
  }

  private buildMonthlyTimeSeriesData(records: ResolvedAnalyticsRecord[], selectedYearForDrill: string) {
    const yearMatch = selectedYearForDrill.match(/FY (\d+)-(\d+)/);
    if (!yearMatch) {
      return [];
    }

    const startYear = Number(yearMatch[1]);
    const monthGroups: Record<string, TimeSeriesPoint> = {};

    for (let index = 0; index < 12; index += 1) {
      const actualMonth = (this.fiscalYearStartMonth + index) % 12;
      const actualYear = startYear + Math.floor((this.fiscalYearStartMonth + index) / 12);
      const monthKey = `${this.monthNames[actualMonth]} ${actualYear}`;

      monthGroups[monthKey] = {
        label: monthKey,
        invested: 0,
        return: 0,
        investedBreakdown: {},
        returnBreakdown: {},
      };
    }

    records.forEach((record) => {
      const startDate = record.timelineStartDate;
      if (!(startDate instanceof Date)) return;

      const fiscalStartYear =
        startDate.getMonth() >= this.fiscalYearStartMonth
          ? startDate.getFullYear()
          : startDate.getFullYear() - 1;

      if (fiscalStartYear !== startYear) return;

      const monthKey = `${this.monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
      if (!monthGroups[monthKey]) return;

      monthGroups[monthKey].invested += record.investedAmount;
      monthGroups[monthKey].return += record.returnAmount;
      monthGroups[monthKey].investedBreakdown[record.category] =
        (monthGroups[monthKey].investedBreakdown[record.category] || 0) +
        record.investedAmount;
      monthGroups[monthKey].returnBreakdown[record.category] =
        (monthGroups[monthKey].returnBreakdown[record.category] || 0) +
        record.returnAmount;
    });

    return Object.values(monthGroups).filter(
      (monthGroup) => monthGroup.invested > 0 || monthGroup.return !== 0,
    );
  }

  private buildCategoryPerformanceRows(records: ResolvedAnalyticsRecord[], months = 12) {
    const categoryGroups = records.reduce<Record<string, ResolvedAnalyticsRecord[]>>((groups, record) => {
      if (!groups[record.category]) {
        groups[record.category] = [];
      }

      groups[record.category].push(record);
      return groups;
    }, {});

    const startMonth = this.startOfMonth(new Date());
    const monthPoints = Array.from({ length: Math.max(months, 1) }, (_, index) =>
      this.endOfMonth(this.addMonths(startMonth, -(Math.max(months, 1) - 1 - index))),
    );

    return Object.entries(categoryGroups)
      .map(([key, items]) => {
        const invested = items.reduce((sum, item) => sum + item.investedAmount, 0);
        const currentValue = items.reduce((sum, item) => sum + item.currentValue, 0);
        const returnAmount = currentValue - invested;
        const returnPercentage = invested > 0 ? (returnAmount / invested) * 100 : 0;

        return {
          key,
          label: key,
          holdings: items.length,
          invested,
          currentValue,
          returnAmount,
          returnPercentage,
          investmentIds: items.map((item) => item.id),
          sparkline: monthPoints.map((pointDate) =>
            items.reduce(
              (sum, item) =>
                item.timelineStartDate.getTime() > pointDate.getTime()
                  ? sum
                  : sum + this.analyticsEngine.resolveInvestmentValueAtDate(
                      item.investment,
                      item.snapshots,
                      pointDate,
                    ).value,
              0,
            ),
          ),
        };
      })
      .sort((left, right) => right.currentValue - left.currentValue);
  }

  private getEffectiveCurrentValue(investment: InvestmentLike) {
    const currentValue = Number(investment?.currentValue ?? Number.NaN);
    if (Number.isFinite(currentValue) && currentValue > 0) {
      return currentValue;
    }

    // Only INVESTMENT-treatment products fall back to cost basis; insurance products must not get a manufactured value.
    if ((investment?.accountingTreatment ?? 'INVESTMENT') !== 'INVESTMENT') {
      return Number.isFinite(currentValue) ? currentValue : 0;
    }

    return Number(investment?.totalInvested || 0);
  }

  private getValueSourceKey(investment: InvestmentLike) {
    const source = String(investment?.currentValueSource || '').trim().toLowerCase();
    if (source === 'valuation_snapshot' || source === 'snapshot') {
      return 'snapshot';
    }
    if (source === 'manual' || source === 'estimated') {
      return 'estimated';
    }
    return 'invested';
  }

  private shouldProductHaveCurrentValue(investment: InvestmentLike): boolean {
    const treatment = investment?.accountingTreatment ?? 'INVESTMENT';

    // INVESTMENT products should have current value (flag as stale if missing)
    if (treatment === 'INVESTMENT') {
      return true;
    }

    // INSURANCE_SAVINGS products may or may not have current value (immature policies, awaiting surrender value)
    // Never flag as stale - lack of value is by design, not missing data
    if (treatment === 'INSURANCE_SAVINGS') {
      return false;
    }

    // PROTECTION_EXPENSE (pure insurance premiums) should NOT have current value
    if (treatment === 'PROTECTION_EXPENSE') {
      return false;
    }

    return true;
  }

  private isStaleValuation(investment: InvestmentLike) {
    // Insurance products without value are not stale - they lack value by design
    if (!this.shouldProductHaveCurrentValue(investment)) {
      return false;
    }

    if (!investment?.lastValuationAt) {
      return true;
    }

    const lastValuationTime = new Date(investment.lastValuationAt).getTime();
    if (Number.isNaN(lastValuationTime)) {
      return true;
    }

    const daysSinceLastValuation =
      (Date.now() - lastValuationTime) / (1000 * 60 * 60 * 24);

    return daysSinceLastValuation > 90;
  }

  private isWithinDays(value: string | Date | null | undefined, days: number) {
    if (!value) return false;

    const target = new Date(value).getTime();
    if (Number.isNaN(target)) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = today.getTime();
    const end = start + days * 24 * 60 * 60 * 1000;

    return target >= start && target <= end;
  }

  private compareDescByDate(
    left: string | Date | null | undefined,
    right: string | Date | null | undefined,
  ) {
    return new Date(right || 0).getTime() - new Date(left || 0).getTime();
  }

  private toOptionalDateString(value: string | Date | null | undefined) {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }

  private mapInvestmentSummaryItem(investment: InvestmentLike): SummaryInvestment {
    return {
      ...investment,
      currentValue: this.getEffectiveCurrentValue(investment),
      currentValueSource: this.getValueSourceKey(investment),
      categoryKey: this.getCategoryKey(investment),
    };
  }

  private normalizeDashboardInvestment(investment: SummaryInvestment): SummaryInvestment {
    return {
      ...investment,
      totalInvested: this.toFiniteNumber(investment.totalInvested),
      currentValue: this.toFiniteNumber(investment.currentValue),
      insuranceCover: this.toFiniteNumber(investment.insuranceCover),
      activeContributionPlan: investment.activeContributionPlan
        ? {
            ...investment.activeContributionPlan,
            amount: this.toFiniteNumber(investment.activeContributionPlan.amount),
          }
        : null,
    };
  }

  private toFiniteNumber(value: unknown): number {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  private async getSummaryInvestments(userId: number): Promise<SummaryInvestment[]> {
    const investments = await this.findAll(userId);
    return investments.map((investment) => this.mapInvestmentSummaryItem(investment));
  }

  private mapActiveContributionPlan(
    activePlan: ActivePlanLike | null,
  ): InvestmentActiveContributionPlanResponseDto | null {
    if (!activePlan) {
      return null;
    }

    return {
      id: activePlan.id,
      amount: activePlan.amount,
      cadenceUnit: activePlan.cadenceUnit,
      cadenceInterval: activePlan.cadenceInterval,
      historicalImportMode: activePlan.historicalImportMode,
      anchorDate: this.toOptionalDateString(activePlan.anchorDate),
      nextDueDate: this.toOptionalDateString(activePlan.nextDueDate),
      endDate: this.toOptionalDateString(activePlan.endDate),
      status: activePlan.status,
    };
  }

  private mapLatestSnapshot(
    latestSnapshot: SnapshotLike | null,
  ): InvestmentLatestSnapshotResponseDto | null {
    if (!latestSnapshot) {
      return null;
    }

    const snapshotDate = this.toOptionalDateString(latestSnapshot.snapshotDate);
    if (!snapshotDate) {
      return null;
    }

    return {
      id: latestSnapshot.id,
      snapshotDate,
      marketValue: latestSnapshot.marketValue,
      units: latestSnapshot.units ?? null,
      price: latestSnapshot.price ?? null,
      source: latestSnapshot.source ?? null,
    };
  }

  private getLatestSnapshot(snapshots: SnapshotLike[] = []): SnapshotLike | null {
    return snapshots
      .filter((snapshot) => snapshot?.snapshotDate)
      .sort(
        (left, right) =>
          new Date(right.snapshotDate).getTime() -
          new Date(left.snapshotDate).getTime(),
      )[0] ?? null;
  }

  private buildPerformanceHistoryFromSnapshots(
    investment: InvestmentLike,
    snapshots: SnapshotLike[] = [],
    events: EventLike[] = [],
  ) {
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return [];
    }

    const confirmedEvents = events
      .filter(
        (event) =>
          this.normalizeEventStatus(event?.status) === 'CONFIRMED' &&
          (event?.eventDate || event?.dueDate),
      )
      .sort(
        (left, right) =>
          new Date(left.eventDate || left.dueDate || 0).getTime() -
          new Date(right.eventDate || right.dueDate || 0).getTime(),
      );
    let eventIndex = 0;
    let investedValue = confirmedEvents.length === 0
      ? Number(investment?.totalInvested ?? 0)
      : 0;

    return [...snapshots]
      .filter((snapshot) => snapshot?.snapshotDate)
      .sort(
        (left, right) =>
          new Date(left.snapshotDate).getTime() -
          new Date(right.snapshotDate).getTime(),
      )
      .reduce<InvestmentPerformanceResponseDto['performanceHistory']>((history, snapshot) => {
        const date = this.toOptionalDateString(snapshot.snapshotDate);
        if (!date) {
          return history;
        }

        const snapshotTime = new Date(date).getTime();
        while (eventIndex < confirmedEvents.length) {
          const event = confirmedEvents[eventIndex];
          const eventTime = new Date(event.eventDate || event.dueDate || 0).getTime();
          if (!Number.isFinite(eventTime) || eventTime > snapshotTime) {
            break;
          }

          const amount = Number(event.amount || 0);
          if (
            event.eventType === InvestmentEventType.CONTRIBUTION ||
            event.eventType === InvestmentEventType.OPENING_BALANCE
          ) {
            investedValue += amount;
          } else if (event.eventType === InvestmentEventType.WITHDRAWAL_PRINCIPAL) {
            investedValue -= amount;
          }
          eventIndex += 1;
        }

        const currentValue = Number(snapshot.marketValue ?? 0);
        const gainLossValue = currentValue - investedValue;
        const gainLossPercentage =
          investedValue > 0 ? (gainLossValue / investedValue) * 100 : 0;

        history.push({
          date,
          currentValue,
          investedValue,
          gainLossValue,
          gainLossPercentage,
          source: 'valuation_snapshot',
        });

        return history;
      }, []);
  }

  private normalizeEventStatus(value: unknown) {
    return String(value || '').trim().toUpperCase();
  }

  private buildPerformanceHistoryFromEvents(events: EventLike[] = []) {
    const confirmedEvents = events
      .filter(
        (event) => this.normalizeEventStatus(event?.status) === 'CONFIRMED',
      )
      .sort(
        (left, right) =>
          new Date(left.eventDate || left.dueDate || 0).getTime() -
          new Date(right.eventDate || right.dueDate || 0).getTime(),
      );

    if (confirmedEvents.length === 0) {
      return [];
    }

    let investedValue = 0;
    let currentValue = 0;

    return confirmedEvents.reduce((history, event) => {
      const amount = Number(event?.amount || 0);
      const eventDate = event?.eventDate || event?.dueDate;
      const eventDateString = this.toOptionalDateString(eventDate);

      if (!eventDateString) {
        return history;
      }

      if (
        event?.eventType === InvestmentEventType.CONTRIBUTION ||
        event?.eventType === InvestmentEventType.OPENING_BALANCE
      ) {
        investedValue += amount;
        currentValue += amount;
      } else if (
        event?.eventType === InvestmentEventType.WITHDRAWAL_PRINCIPAL
      ) {
        investedValue -= amount;
        currentValue -= amount;
      } else if (
        event?.eventType === InvestmentEventType.OPENING_INCOME_CREDIT ||
        event?.eventType === InvestmentEventType.INCOME_CREDIT
      ) {
        currentValue += amount;
      } else {
        return history;
      }

      const gainLossValue = currentValue - investedValue;
      const gainLossPercentage =
        investedValue > 0 ? (gainLossValue / investedValue) * 100 : 0;

      history.push({
        date: eventDateString,
        currentValue,
        investedValue,
        gainLossValue,
        gainLossPercentage,
        source: 'investment_event',
        eventType: event?.eventType ?? null,
      });

      return history;
    }, [] as InvestmentPerformanceResponseDto['performanceHistory']);
  }

  private buildDerivedEventValuation(events: EventLike[] = [], accountingTreatment: AccountingTreatment = 'INVESTMENT') {
    const confirmedEvents = events.filter(
      (event) => this.normalizeEventStatus(event?.status) === 'CONFIRMED',
    );

    if (confirmedEvents.length === 0) {
      return null;
    }

    // Premiums are pure expense here; never counted as invested capital or product value.
    if (accountingTreatment === 'PROTECTION_EXPENSE') {
      return null;
    }

    const principalIn = confirmedEvents
      .filter((event) => {
        const eventType = event?.eventType;
        if (eventType === InvestmentEventType.CONTRIBUTION || eventType === InvestmentEventType.OPENING_BALANCE) {
          return true;
        }
        // For insurance-savings, PREMIUM is the "premium paid" contribution equivalent of CONTRIBUTION.
        return accountingTreatment === 'INSURANCE_SAVINGS' && eventType === InvestmentEventType.PREMIUM;
      })
      .reduce((sum, event) => sum + Number(event?.amount || 0), 0);

    const principalOut = confirmedEvents
      .filter(
        (event) =>
          event?.eventType === InvestmentEventType.WITHDRAWAL_PRINCIPAL,
      )
      .reduce((sum, event) => sum + Number(event?.amount || 0), 0);

    const incomeCredits = confirmedEvents
      .filter(
        (event) =>
          event?.eventType === InvestmentEventType.OPENING_INCOME_CREDIT ||
          event?.eventType === InvestmentEventType.INCOME_CREDIT,
      )
      .reduce((sum, event) => sum + Number(event?.amount || 0), 0);

    const latestConfirmedEvent = confirmedEvents
      .filter((event) => event?.eventDate)
      .sort(
        (left, right) =>
          new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime(),
      )[0] ?? null;

    if (accountingTreatment === 'INSURANCE_SAVINGS') {
      // Premium-paid history is permanent: a money-back/payout (WITHDRAWAL_PRINCIPAL) must not retroactively reduce it.
      // Until an explicit valuation/benefit value exists, insurance savings are valued at premiums paid.
      return {
        totalInvested: principalIn,
        currentValue: principalIn,
        lastValuationAt: latestConfirmedEvent?.eventDate ?? null,
        currentValueSource: 'manual',
      };
    }

    const totalInvested = principalIn - principalOut;

    return {
      totalInvested,
      currentValue: totalInvested + incomeCredits,
      lastValuationAt: latestConfirmedEvent?.eventDate ?? null,
      currentValueSource: 'manual',
    };
  }

  private hydrateInvestmentWithDerivedEventValuation<T extends InvestmentLike>(
    investment: T,
    events: EventLike[] = [],
  ): T {
    const storedCurrentValue = Number(investment?.currentValue ?? Number.NaN);
    const derivedValuation = this.analyticsEngine.deriveEventValuation(events, investment?.accountingTreatment);
    const hasStoredCurrentValue = Number.isFinite(storedCurrentValue);
    const shouldKeepStoredValue =
      hasStoredCurrentValue &&
      (storedCurrentValue !== 0 || !derivedValuation);

    if (shouldKeepStoredValue || !derivedValuation) {
      return investment;
    }

    return {
      ...investment,
      totalInvested: derivedValuation.totalInvested,
      currentValue: derivedValuation.currentValue,
      currentValueSource:
        investment.currentValueSource ?? derivedValuation.currentValueSource,
      lastValuationAt:
        investment.lastValuationAt ?? derivedValuation.lastValuationAt,
    };
  }

  private buildValueSourceSummary(investments: SummaryInvestment[]): InvestmentValueSourceSummaryDto {
    return investments.reduce<InvestmentValueSourceSummaryDto>(
      (summary, investment) => {
        const source = this.getValueSourceKey(investment);
        const currentValue = this.getEffectiveCurrentValue(investment);
        const treatment = investment?.accountingTreatment ?? 'INVESTMENT';

        // Group by value source: snapshot | estimated | invested
        if (source === 'snapshot') {
          summary.snapshotBackedValue += currentValue;
          summary.snapshotBackedCount += 1;
          summary.snapshotBackedIds.push(investment.id);
        } else if (source === 'estimated') {
          summary.estimatedValue += currentValue;
          summary.estimatedCount += 1;
          summary.estimatedIds.push(investment.id);
        } else {
          summary.investedOnlyValue += currentValue;
          summary.investedOnlyCount += 1;
          summary.investedOnlyIds.push(investment.id);
        }

        // Track INSURANCE_SAVINGS separately: with value vs without value
        if (treatment === 'INSURANCE_SAVINGS') {
          if (currentValue > 0) {
            summary.insuranceSavingsWithValueCount += 1;
            summary.insuranceSavingsWithValueValue += currentValue;
            summary.insuranceSavingsWithValueIds.push(investment.id);
          } else {
            // INSURANCE_SAVINGS without known current value (immature, awaiting statement, etc.)
            summary.insuranceSavingsWithoutValueCount += 1;
            summary.insuranceSavingsWithoutValueIds.push(investment.id);
          }
        }

        // Flag stale valuations (only for products that should have current value)
        if (investment.status === 'active' && this.isStaleValuation(investment)) {
          summary.staleValuationCount += 1;
          summary.staleValuationValue += currentValue;
          summary.staleValuationIds.push(investment.id);
        }

        return summary;
      },
      {
        snapshotBackedValue: 0,
        estimatedValue: 0,
        investedOnlyValue: 0,
        snapshotBackedCount: 0,
        estimatedCount: 0,
        investedOnlyCount: 0,
        staleValuationCount: 0,
        staleValuationValue: 0,
        insuranceSavingsWithValueCount: 0,
        insuranceSavingsWithValueValue: 0,
        insuranceSavingsWithoutValueCount: 0,
        snapshotBackedIds: [],
        estimatedIds: [],
        investedOnlyIds: [],
        staleValuationIds: [],
        insuranceSavingsWithValueIds: [],
        insuranceSavingsWithoutValueIds: [],
      },
    );
  }

  private buildCategorySubPerformanceRows(
    investments: SummaryInvestment[],
    snapshotsByInvestment: Map<string, SnapshotLike[]>,
    months = 12,
  ) {
    const groups: Record<string, { typeKey: string; catKey: string; records: ResolvedAnalyticsRecord[] }> = {};
    investments.forEach((investment) => {
      const typeKey = this.getCategoryKey(investment);
      const catKey = String(investment.assetCategory || '').trim().toUpperCase();
      if (!catKey || catKey === typeKey) return;
      const compositeKey = `${typeKey}::${catKey}`;
      if (!groups[compositeKey]) {
        groups[compositeKey] = { typeKey, catKey, records: [] };
      }
      groups[compositeKey].records.push(
        this.buildResolvedAnalyticsRecord(investment, snapshotsByInvestment.get(String(investment.id)) ?? []),
      );
    });
    const startMonth = this.startOfMonth(new Date());
    const monthPoints = Array.from({ length: Math.max(months, 1) }, (_, index) =>
      this.endOfMonth(this.addMonths(startMonth, -(Math.max(months, 1) - 1 - index))),
    );
    return Object.entries(groups)
      .map(([, { typeKey, catKey, records }]) => {
        const invested = records.reduce((sum, r) => sum + r.investedAmount, 0);
        const currentValue = records.reduce((sum, r) => sum + r.currentValue, 0);
        const returnAmount = currentValue - invested;
        const returnPercentage = invested > 0 ? (returnAmount / invested) * 100 : 0;
        return {
          key: catKey,
          label: catKey,
          assetType: typeKey,
          holdings: records.length,
          invested,
          currentValue,
          returnAmount,
          returnPercentage,
          investmentIds: records.map((r) => r.id),
          sparkline: monthPoints.map((pointDate) =>
            records.reduce(
              (sum, item) =>
                item.timelineStartDate.getTime() > pointDate.getTime()
                  ? sum
                  : sum + this.analyticsEngine.resolveInvestmentValueAtDate(item.investment, item.snapshots, pointDate).value,
              0,
            ),
          ),
        };
      })
      .sort((a, b) => b.currentValue - a.currentValue);
  }

  private buildDashboardSummary(
    investments: SummaryInvestment[],
    records: ResolvedAnalyticsRecord[],
  ): InvestmentDashboardSummaryDto {
    // Only products participate in portfolio totals/gain-loss when their accounting treatment is INVESTMENT.
    const investmentRecords = records.filter((record) => record.accountingTreatment === 'INVESTMENT');
    const investmentRows = investments.filter((investment) => (investment.accountingTreatment ?? 'INVESTMENT') === 'INVESTMENT');
    const insuranceSavingsRows = investments.filter((investment) => investment.accountingTreatment === 'INSURANCE_SAVINGS');
    const protectionExpenseRows = investments.filter((investment) => investment.accountingTreatment === 'PROTECTION_EXPENSE');

    const totalInvested = investmentRows.reduce(
      (sum, investment) => sum + Number(investment.totalInvested || 0),
      0,
    );
    const totalCurrentValue = investmentRecords.reduce(
      (sum, record) => sum + Number(record.currentValue || 0),
      0,
    );
    const totalReturn = totalCurrentValue - totalInvested;
    const returnPercentage =
      totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    // KPI 1: Upcoming Maturity (INVESTMENT only, within 90 days)
    const upcomingMaturity = investmentRecords
      .filter(
        (record) =>
          record.investment.status === 'active' &&
          this.isWithinDays(record.investment.maturityDate, 90),
      )
      .reduce((sum, record) => sum + Number(record.currentValue || 0), 0);

    // KPI 3 Extended: Upcoming maturity/benefits from INSURANCE_SAVINGS (within 90 days)
    const upcomingMaturityFromInsuranceSavings = insuranceSavingsRows
      .filter(
        (investment) =>
          investment.status === 'active' &&
          this.isWithinDays(investment.maturityDate, 90),
      )
      .reduce((sum, investment) => sum + Number(investment.currentValue || 0), 0);

    // KPI 4: Insurance Cover breakdown
    const insuranceCoverProtection = protectionExpenseRows
      .filter((investment) => investment.status === 'active')
      .reduce(
        (sum, investment) => sum + Number(investment.insuranceCover || 0),
        0,
      );

    const insuranceCoverSavings = insuranceSavingsRows
      .filter((investment) => investment.status === 'active')
      .reduce(
        (sum, investment) => sum + Number(investment.insuranceCover || 0),
        0,
      );

    const insuranceCover = insuranceCoverProtection + insuranceCoverSavings;

    // KPI 2: Total Contributions (INVESTMENT + INSURANCE_SAVINGS)
    const insuranceSavingsContribution = insuranceSavingsRows
      .filter((investment) => investment.status === 'active')
      .reduce((sum, investment) => sum + Number(investment.totalInvested || 0), 0);

    const totalContributions = totalInvested + insuranceSavingsContribution;

    // KPI 2 Extended: Current value from INSURANCE_SAVINGS products
    const totalCurrentValueFromInsuranceSavings = insuranceSavingsRows
      .filter(
        (investment) =>
          investment.status === 'active' &&
          Number.isFinite(Number(investment.currentValue || 0)) &&
          Number(investment.currentValue || 0) > 0,
      )
      .reduce((sum, investment) => sum + Number(investment.currentValue || 0), 0);

    // KPI 5: Protection Expense (PROTECTION_EXPENSE premiums)
    const protectionExpenseTotal = protectionExpenseRows
      .filter((investment) => investment.status === 'active')
      .reduce((sum, investment) => sum + Number(investment.totalInvested || 0), 0);

    return {
      totalInvestments: investments.length,
      totalContributions,
      totalInvested,
      totalCurrentValue,
      totalReturn,
      returnPercentage,
      totalCurrentValueFromInsuranceSavings,
      upcomingMaturity,
      upcomingMaturityFromInsuranceSavings,
      insuranceCover,
      insuranceCoverProtection,
      insuranceCoverSavings,
      insuranceSavingsContribution,
      protectionExpenseTotal,
      valueSourceSummary: this.buildValueSourceSummary(investments),
    };
  }

  private buildDetailShellResponse(
    investment: InvestmentLike,
    activePlan: ActivePlanLike | null,
    eventCount: number,
    snapshotCount: number,
    latestSnapshot: SnapshotLike | null,
  ): InvestmentDetailResponseDto {
    return {
      id: investment.id,
      accountId: investment.accountId ?? null,
      assetTaxonomyId: investment.assetTaxonomyId ?? null,
      name: investment.name,
      assetType: investment.assetType ?? undefined,
      assetCategory: investment.assetCategory ?? undefined,
      institutionName: investment.institutionName ?? null,
      totalInvested: Number(investment.totalInvested || 0),
      currentValue: investment.currentValue ?? undefined,
      startDate: this.toOptionalDateString(investment.startDate),
      status: investment.status,
      maturityDate: this.toOptionalDateString(investment.maturityDate),
      currency: investment.currency ?? undefined,
      contributionMode: investment.contributionMode ?? undefined,
      currentValueSource: investment.currentValueSource ?? null,
      lastValuationAt: this.toOptionalDateString(investment.lastValuationAt),
      insuranceCover: investment.insuranceCover ?? undefined,
      referenceNumber: investment.referenceNumber ?? null,
      notes: investment.notes ?? null,
      activeContributionPlan: this.mapActiveContributionPlan(activePlan),
      eventCount,
      snapshotCount,
      latestSnapshot: this.mapLatestSnapshot(latestSnapshot),
      createdAt: this.toOptionalDateString(investment.createdAt) ?? undefined,
      updatedAt: this.toOptionalDateString(investment.updatedAt) ?? undefined,
    };
  }

  private buildPerformanceResponse(
    investment: InvestmentLike,
    valuationSnapshots: SnapshotLike[],
    investmentEvents: EventLike[],
  ): InvestmentPerformanceResponseDto {
    const latestSnapshot = this.getLatestSnapshot(valuationSnapshots);

    if (latestSnapshot) {
      return {
        investmentId: investment.id,
        performanceHistorySource: 'valuation_snapshot',
        performanceHistory: this.buildPerformanceHistoryFromSnapshots(
          investment,
          valuationSnapshots,
          investmentEvents,
        ),
      };
    }

    return {
      investmentId: investment.id,
      performanceHistorySource: 'investment_event',
      performanceHistory: this.buildPerformanceHistoryFromEvents(investmentEvents),
    };
  }

  async findAll(userId: number): Promise<SummaryInvestment[]> {
    const investments = await this.repository.findAll(userId);
    const plans = await this.contributionPlansService.findAllByUser(userId);
    const plansByInvestmentId = new Map<string, ActivePlanLike[]>();
    const requiresDerivedValuation = investments.some(
      (investment) => {
        const currentValue = Number(investment?.currentValue ?? Number.NaN);

        return !Number.isFinite(currentValue) || currentValue === 0;
      },
    );
    const eventsByInvestmentId = new Map<string, EventLike[]>();

    if (requiresDerivedValuation) {
      const events = await this.investmentEventsService.findAll(userId);
      events.forEach((event) => {
        const investmentId = String(event.investmentId);
        const existingEvents = eventsByInvestmentId.get(investmentId) ?? [];
        existingEvents.push(event);
        eventsByInvestmentId.set(investmentId, existingEvents);
      });
    }

    plans.forEach((plan) => {
      const investmentId = String(plan.investmentId);
      const existingPlans = plansByInvestmentId.get(investmentId) ?? [];
      existingPlans.push(plan);
      plansByInvestmentId.set(investmentId, existingPlans);
    });

    return investments.map((investment) => {
      const hydratedInvestment = this.hydrateInvestmentWithDerivedEventValuation(
        investment,
        eventsByInvestmentId.get(String(investment.id)) ?? [],
      );

      return {
        ...hydratedInvestment,
        activeContributionPlan: this.mapActiveContributionPlan(
          this.selectDisplayContributionPlan(
            plansByInvestmentId.get(String(investment.id)) ?? [],
          ),
        ),
      };
    });
  }

  private async buildDashboardUpcoming(userId: number) {
    const investments = await this.getSummaryInvestments(userId);

    // Includes overdue contributions and anything due within the next 60 days.
    const contributionHorizon = new Date();
    contributionHorizon.setDate(contributionHorizon.getDate() + 60);

    const upcomingContributions = investments
      .filter(
        (investment) =>
          investment.status === 'active' &&
          investment.activeContributionPlan?.nextDueDate &&
          new Date(investment.activeContributionPlan.nextDueDate).getTime() <=
            contributionHorizon.getTime(),
      )
      .sort((left, right) =>
        new Date(left.activeContributionPlan?.nextDueDate || 0).getTime() -
        new Date(right.activeContributionPlan?.nextDueDate || 0).getTime(),
      );

    const recentInvestments = [...investments]
      .sort((left, right) =>
        this.compareDescByDate(
          left.createdAt || left.startDate,
          right.createdAt || right.startDate,
        ),
      )
      .slice(0, 5);

    const topCurrentValueItems = investments
      .filter(
        (investment) =>
          investment.status === 'active' &&
          (investment.accountingTreatment ?? 'INVESTMENT') !== 'PROTECTION_EXPENSE' &&
          this.getEffectiveCurrentValue(investment) > 0,
      )
      .sort(
        (left, right) =>
          this.getEffectiveCurrentValue(right) - this.getEffectiveCurrentValue(left),
      )
      .slice(0, 5);

    const upcomingMaturities = investments
      .filter((investment) => investment.status === 'active' && investment.maturityDate)
      .sort(
        (left, right) =>
          new Date(left.maturityDate || 0).getTime() -
          new Date(right.maturityDate || 0).getTime(),
      )
      .slice(0, 5);

    return {
      upcomingContributions: upcomingContributions.map((investment) => this.normalizeDashboardInvestment(investment)),
      recentInvestments: recentInvestments.map((investment) => this.normalizeDashboardInvestment(investment)),
      topCurrentValueItems: topCurrentValueItems.map((investment) => this.normalizeDashboardInvestment(investment)),
      upcomingMaturities: upcomingMaturities.map((investment) => this.normalizeDashboardInvestment(investment)),
    };
  }

  async getDashboardAnalytics(userId: number): Promise<unknown> {
    const [investments, upcoming] = await Promise.all([
      this.getSummaryInvestments(userId),
      this.buildDashboardUpcoming(userId),
    ]);
    const facts = await this.analyticsEngine.loadFacts(userId, investments);
    const query = {
      range: 'ALL' as const,
      granularity: 'YEAR' as const,
      calendar: 'FISCAL' as const,
      fiscalYearStartMonth: 3,
    };
    const points = await this.analyticsEngine.calculate(query, facts);
    const snapshots = facts.snapshots;
    const treatmentByInvestmentId = new Map(
      investments.map((investment) => [String(investment.id), investment.accountingTreatment ?? 'INVESTMENT']),
    );
    const confirmedEvents = facts.events.filter((event) => this.normalizeEventStatus(event.status) === 'CONFIRMED');
    const eventAmount = (event: EventLike) => Number(event.amount ?? 0);
    const eventTotal = (predicate: (event: EventLike) => boolean, treatment?: AccountingTreatment) =>
      confirmedEvents
        .filter((event) => predicate(event) && (!treatment || treatmentByInvestmentId.get(String(event.investmentId)) === treatment))
        .reduce((sum, event) => sum + eventAmount(event), 0);
    const investmentContributions = eventTotal(
      (event) => event.eventType === InvestmentEventType.CONTRIBUTION || event.eventType === InvestmentEventType.OPENING_BALANCE,
      'INVESTMENT',
    );
    const insuranceSavingsPremiums = eventTotal((event) => event.eventType === InvestmentEventType.PREMIUM, 'INSURANCE_SAVINGS');
    const protectionPremiums = eventTotal((event) => event.eventType === InvestmentEventType.PREMIUM, 'PROTECTION_EXPENSE');
    const eventBasedContributions = investmentContributions + insuranceSavingsPremiums;
    const snapshotsByInvestment = this.buildSnapshotsByInvestment(snapshots);
    const records = investments.map((investment) =>
      this.buildResolvedAnalyticsRecord(
        investment,
        snapshotsByInvestment.get(String(investment.id)) ?? [],
        confirmedEvents.filter((event) => String(event.investmentId) === String(investment.id)),
      ),
    );
    // Growth/allocation/timeline analytics include INVESTMENT + INSURANCE_SAVINGS (valued), exclude PROTECTION_EXPENSE.
    const valuedRecords = records.filter((record) => record.accountingTreatment !== 'PROTECTION_EXPENSE');
    // Asset Type Performance analytics strictly focus on pure INVESTMENT products (exclude all insurance).
    const investmentOnlyRecords = records.filter(
      (record) => (record.accountingTreatment ?? 'INVESTMENT') === 'INVESTMENT',
    );
    const investmentOnlyInvestments = investments.filter(
      (investment) => (investment.accountingTreatment ?? 'INVESTMENT') === 'INVESTMENT',
    );
    const summary = this.buildDashboardSummary(investments, records);
    const categoryPerformance = this.buildCategoryPerformanceRows(investmentOnlyRecords, 12);
    const categorySubPerformance = this.buildCategorySubPerformanceRows(investmentOnlyInvestments, snapshotsByInvestment, 12);
    const byKey = points.reduce<Record<string, typeof points[number]>>((result, point) => {
      result[point.period.key] = point;
      return result;
    }, {});

    return {
      responseContext: {
        generatedAt: new Date().toISOString(),
        calculationVersion: '1',
        currency: investments[0]?.currency ?? 'INR',
        timezone: 'Asia/Kolkata',
        calendar: 'fiscal',
        fiscalYearStartMonth: 4,
        availableFrom: points[0]?.period.startDate.toISOString().slice(0, 10) ?? null,
        availableTo: new Date().toISOString().slice(0, 10),
      },
      widgets: {
        kpis: {
          totalContributions: {
            value: eventBasedContributions,
            investments: investmentContributions,
            insuranceSavings: insuranceSavingsPremiums,
          },
          currentPortfolioValue: {
            value: summary.totalCurrentValue + summary.totalCurrentValueFromInsuranceSavings,
            investments: summary.totalCurrentValue,
            insuranceSavings: summary.totalCurrentValueFromInsuranceSavings,
            returnAmount: summary.totalReturn,
            returnPercentage: summary.returnPercentage,
          },
          upcomingMaturity: {
            value: summary.upcomingMaturity + summary.upcomingMaturityFromInsuranceSavings,
            investments: summary.upcomingMaturity,
            insuranceSavings: summary.upcomingMaturityFromInsuranceSavings,
          },
          insuranceCover: {
            value: summary.insuranceCover,
            protection: summary.insuranceCoverProtection,
            savingsLinked: summary.insuranceCoverSavings,
          },
          insurancePremiumsPaid: {
            value: insuranceSavingsPremiums + protectionPremiums,
            savingsLinked: insuranceSavingsPremiums,
            protection: protectionPremiums,
          },
        },
        portfolioGrowth: {
          order: points.map((point) => point.period.key),
          byKey,
        },
        capitalDeployment: {
          order: points.map((point) => point.period.key),
          byKey,
        },
        sourceOfValue: summary.valueSourceSummary,
        assetTypePerformance: { rows: categoryPerformance },
        insurancePosition: {
          cover: summary.insuranceCover,
          premiumsPaid: insuranceSavingsPremiums + protectionPremiums,
        },
        upcomingMaturities: upcoming.upcomingMaturities,
        allocationMix: { rows: categorySubPerformance },
        upcomingContributions: upcoming.upcomingContributions,
        topHoldings: upcoming.topCurrentValueItems,
        recentlyAdded: upcoming.recentInvestments,
      },
    };
  }

  async findDetailShell(id: number, userId: number): Promise<InvestmentDetailResponseDto | null> {
    const investment = await this.repository.findOne(id, userId);
    if (!investment) return null;

    const [plans, investmentEvents, valuationSnapshots] = await Promise.all([
      this.contributionPlansService.findAllByInvestment(String(investment.id)),
      this.investmentEventsService.findAllByInvestment(String(investment.id)),
      this.valuationSnapshotsService.findAllByInvestment(String(investment.id)),
    ]);

    const activePlan = this.selectDisplayContributionPlan(plans);
    const latestSnapshot = this.getLatestSnapshot(valuationSnapshots);
    const hydratedInvestment = this.hydrateInvestmentWithDerivedEventValuation(
      investment,
      investmentEvents,
    );

    return this.buildDetailShellResponse(
      hydratedInvestment,
      activePlan,
      investmentEvents.length,
      valuationSnapshots.length,
      latestSnapshot,
    );
  }

  async getPerformance(id: number, userId: number): Promise<InvestmentPerformanceResponseDto | null> {
    const investment = await this.repository.findOne(id, userId);
    if (!investment) return null;

    const investmentEvents = await this.investmentEventsService.findAllByInvestment(String(investment.id));
    const valuationSnapshots = await this.valuationSnapshotsService.findAllByInvestment(String(investment.id));

    return this.buildPerformanceResponse(
      investment,
      valuationSnapshots,
      investmentEvents,
    );
  }

  async findOne(id: number, userId: number): Promise<InvestmentDetailResponseDto | null> {
    return this.findDetailShell(id, userId);
  }

  async update(id: number, updateInvestmentDto: UpdateInvestmentDto, userId: number) {
    const existingInvestment = await this.repository.findOne(id, userId);
    if (!existingInvestment) {
      return null;
    }

    await this.assertInvestmentCrudRules({
      ...existingInvestment,
      ...updateInvestmentDto,
    });

    await this.assertTaxonomyOwnership(
      updateInvestmentDto.assetTaxonomyId ?? existingInvestment.assetTaxonomyId,
      userId,
    );

    const updated = await this.repository.update(id, updateInvestmentDto, userId);

    if (
      updateInvestmentDto.status &&
      updateInvestmentDto.status.toLowerCase() !== String(existingInvestment.status || '').toLowerCase() &&
      ['matured', 'closed'].includes(updateInvestmentDto.status.toLowerCase())
    ) {
      const activePlans = await this.contributionPlansService.findAllByInvestment(String(id));
      for (const plan of activePlans) {
        if (String(plan.status || '').toLowerCase() === 'active') {
          await this.contributionPlansService.update(
            String(plan.id),
            { status: 'paused' },
            userId,
          );
        }
      }
    }

    return updated;
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}