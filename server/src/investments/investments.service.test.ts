import { BadRequestException } from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetTaxonomyRepository } from '../investment-asset-taxonomy/repositories/asset-taxonomy.repository';
import { PrismaService } from '../database/prisma.service';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { ValuationSnapshotsService } from '../valuation-snapshots/valuation-snapshots.service';
import { AnalyticsEngineService } from './analytics/analytics-engine.service';
import { InvestmentRepository } from './repositories/investment.repository';
import { InvestmentsService } from './investments.service';

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findAllForPortfolio: vi.fn(),
    findPage: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const assetTaxonomyRepository = { findOne: vi.fn() };
  const contributionPlansService = {
    confirmRecurringPlan: vi.fn(),
    findAllByInvestmentIds: vi.fn().mockResolvedValue([]),
    findAllByUser: vi.fn().mockResolvedValue([]),
    findAllByInvestment: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  };
  const investmentEventsService = {
    create: vi.fn(),
    findAllByInvestment: vi.fn().mockResolvedValue([]),
  };
  const valuationSnapshotsService = { findAllByInvestment: vi.fn().mockResolvedValue([]) };
  const analyticsEngine = {
    deriveEventValuation: vi.fn().mockReturnValue(null),
    loadFacts: vi.fn().mockResolvedValue({ events: [], snapshots: [] }),
    calculate: vi.fn().mockResolvedValue([]),
    resolveInvestmentValueAtDate: vi.fn().mockReturnValue({ value: 125, source: 'snapshot' }),
  };
  const investment = {
    findUnique: vi.fn().mockResolvedValue({ currentValue: 125 }),
    update: vi.fn(),
  };
  const transaction = {
    investment,
    investmentContributionPlan: { findFirst: vi.fn() },
    valuationSnapshot: { create: vi.fn() },
    investmentBenefit: { create: vi.fn() },
    financialAccount: { findFirst: vi.fn() },
  };
  const prisma = {
    appMetaConfigRef: {
      findFirst: vi.fn().mockResolvedValue({ id: 5, code: 'EQUITY', label: 'Equity' }),
      findMany: vi.fn().mockResolvedValue([{ id: 6, parentId: 5, code: 'STOCK', label: 'Stock' }]),
    },
    financialAccount: { findFirst: vi.fn().mockResolvedValue({ id: 9, currency: 'USD' }) },
    $transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(transaction)),
  };

  return {
    service: new InvestmentsService(
      repository as unknown as InvestmentRepository,
      assetTaxonomyRepository as unknown as AssetTaxonomyRepository,
      contributionPlansService as unknown as InvestmentContributionPlansService,
      investmentEventsService as unknown as InvestmentEventsService,
      valuationSnapshotsService as unknown as ValuationSnapshotsService,
      prisma as unknown as PrismaService,
      analyticsEngine as unknown as AnalyticsEngineService,
    ),
    repository,
    assetTaxonomyRepository,
    contributionPlansService,
    investmentEventsService,
    valuationSnapshotsService,
    analyticsEngine,
    prisma,
    transaction,
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Index fund',
    assetType: 'EQUITY',
    assetCategory: 'STOCK',
    accountId: 9,
    institutionName: 'Broker',
    status: 'active',
    currency: 'USD',
    startDate: '2026-01-01T00:00:00.000Z',
    totalInvested: 100,
    currentValue: 125,
    contributionMode: 'ONE_TIME',
    ...overrides,
  };
}

describe('InvestmentsService', () => {
  let service: InvestmentsService;
  let repository: ReturnType<typeof createService>['repository'];
  let assetTaxonomyRepository: ReturnType<typeof createService>['assetTaxonomyRepository'];
  let contributionPlansService: ReturnType<typeof createService>['contributionPlansService'];
  let investmentEventsService: ReturnType<typeof createService>['investmentEventsService'];
  let valuationSnapshotsService: ReturnType<typeof createService>['valuationSnapshotsService'];
  let analyticsEngine: ReturnType<typeof createService>['analyticsEngine'];
  let prisma: ReturnType<typeof createService>['prisma'];
  let transaction: ReturnType<typeof createService>['transaction'];

  beforeEach(() => {
    ({
      service,
      repository,
      assetTaxonomyRepository,
      contributionPlansService,
      investmentEventsService,
      valuationSnapshotsService,
      analyticsEngine,
      prisma,
      transaction,
    } = createService());
  });

  describe('create', () => {
    it('seeds opening activity and a valuation snapshot for a one-time investment', async () => {
      const input = createInput({ lastValuationAt: '2026-02-01T00:00:00.000Z' });
      const created = { id: 12, accountingTreatment: 'INVESTMENT' };
      repository.create.mockResolvedValue(created);
      transaction.investment.findUnique.mockResolvedValue({ currentValue: 125 });

      await expect(service.create(input as never, 42)).resolves.toMatchObject({
        id: 12,
        accountingTreatment: 'INVESTMENT',
        currentValue: 125,
      });

      expect(assetTaxonomyRepository.findOne).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(input, 42, transaction);
      expect(investmentEventsService.create).toHaveBeenCalledWith(
        {
          investmentId: '12',
          eventType: InvestmentEventType.OPENING_BALANCE,
          status: 'CONFIRMED',
          eventSource: 'MANUAL',
          eventDate: input.startDate,
          amount: 100,
          netAmount: 100,
        },
        undefined,
        transaction,
      );
      expect(transaction.valuationSnapshot.create).toHaveBeenCalledWith({
        data: {
          userId: 42,
          investmentId: 12,
          snapshotDate: new Date('2026-02-01T00:00:00.000Z'),
          marketValue: 125,
          source: 'manual',
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('rejects an investment when its linked account is not owned by the user', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue(null);

      await expect(service.create(createInput() as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an investment when its taxonomy bucket is not owned by the user', async () => {
      assetTaxonomyRepository.findOne.mockResolvedValue(null);
      const input = createInput({ assetTaxonomyId: 27 });

      await expect(service.create(input as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(assetTaxonomyRepository.findOne).toHaveBeenCalledWith(27, 42);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it.each([
      { accountId: 0 },
      { name: '   ' },
      { assetType: '' },
      { assetCategory: '' },
      { institutionName: '' },
      { startDate: 'not-a-date' },
      { maturityDate: '2025-12-31T00:00:00.000Z' },
      { totalInvested: -1 },
      { currentValue: -1 },
      { insuranceCover: -1 },
    ])('rejects creation when a business invariant is violated: %o', async (overrides) => {
      await expect(service.create(createInput(overrides) as never, 42)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a linked account whose currency differs from the investment', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue({ id: 9, currency: 'EUR' });

      await expect(service.create(createInput() as never, 42)).rejects.toThrow(
        'Investment and linked account must use the same currency',
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects unsupported asset types and categories that do not belong to the type', async () => {
      prisma.appMetaConfigRef.findFirst.mockResolvedValueOnce(null);

      await expect(service.create(createInput() as never, 42)).rejects.toThrow(
        'Unsupported investment type',
      );

      prisma.appMetaConfigRef.findFirst.mockResolvedValue({ id: 5, code: 'EQUITY', label: 'Equity' });
      await expect(
        service.create(createInput({ assetCategory: 'BOND' }) as never, 42),
      ).rejects.toThrow('Investment category is not valid for the selected type');

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('delegates recurring-plan setup without seeding one-time opening activity', async () => {
      const recurringPlan = { amount: 100, cadenceUnit: 'month' };
      const input = createInput({ contributionMode: 'RECURRING', recurringPlan });
      repository.create.mockResolvedValue({ id: 13, accountingTreatment: 'INVESTMENT' });

      await service.create(input as never, 42);

      expect(investmentEventsService.create).not.toHaveBeenCalled();
      expect(transaction.valuationSnapshot.create).not.toHaveBeenCalled();
      expect(contributionPlansService.confirmRecurringPlan).toHaveBeenCalledWith(
        '13',
        recurringPlan,
        42,
        transaction,
      );
    });

    it('saves an expected benefit after verifying its destination account', async () => {
      const benefit = {
        benefitType: 'COUPON',
        amount: 25,
        benefitDate: '2026-12-01T00:00:00.000Z',
        destinationAccountId: 11,
        notes: 'Quarterly coupon',
      };
      const input = createInput({ totalInvested: 0, currentValue: undefined, expectedBenefits: [benefit] });
      repository.create.mockResolvedValue({ id: 14, accountingTreatment: 'INVESTMENT' });
      transaction.financialAccount.findFirst.mockResolvedValue({ id: 11, currency: 'USD' });

      await service.create(input as never, 42);

      expect(transaction.financialAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 11, userId: 42, currency: 'USD' },
      });
      expect(transaction.investmentBenefit.create).toHaveBeenCalledWith({
        data: {
          investmentId: 14,
          benefitType: 'COUPON',
          amount: 25,
          benefitDate: new Date('2026-12-01T00:00:00.000Z'),
          destinationAccountId: 11,
          notes: 'Quarterly coupon',
        },
      });
      expect(investmentEventsService.create).not.toHaveBeenCalled();
    });

    it('records insurance premiums and skips valuation snapshots for protection expenses', async () => {
      repository.create.mockResolvedValue({ id: 15, accountingTreatment: 'PROTECTION_EXPENSE' });

      await service.create(createInput({ totalInvested: 100, currentValue: 75 }) as never, 42);

      expect(investmentEventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          investmentId: '15',
          eventType: InvestmentEventType.PREMIUM,
          amount: 100,
        }),
        undefined,
        transaction,
      );
      expect(transaction.valuationSnapshot.create).not.toHaveBeenCalled();
    });
  });

  describe('getMetadata', () => {
    it('returns active asset types with their categories', async () => {
      prisma.appMetaConfigRef.findMany
        .mockResolvedValueOnce([{ id: 5, code: 'EQUITY', label: 'Equity' }])
        .mockResolvedValueOnce([{ id: 6, parentId: 5, code: 'STOCK', label: 'Stock' }]);

      await expect(service.getMetadata()).resolves.toEqual({
        asset_configs: [{
          id: 5,
          code: 'EQUITY',
          label: 'Equity',
          accountingTreatment: null,
          categories: [{ id: 6, code: 'STOCK', label: 'Stock', accountingTreatment: null }],
        }],
      });

      expect(prisma.appMetaConfigRef.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('returns an empty collection when the user has no investments', async () => {
      repository.findAll.mockResolvedValue([]);

      await expect(service.findAll(42)).resolves.toEqual([]);

      expect(repository.findAll).toHaveBeenCalledWith(42);
      expect(contributionPlansService.findAllByUser).toHaveBeenCalledWith(42);
    });

    it('maps investment totals and selects the active contribution plan', async () => {
      repository.findAll.mockResolvedValue([{ ...createInput(), id: 12 }]);
      contributionPlansService.findAllByUser.mockResolvedValue([
        { id: 32, investmentId: 12, status: 'paused', amount: 20, cadenceUnit: 'month', cadenceInterval: 1 },
        { id: 31, investmentId: 12, status: 'active', amount: 40, cadenceUnit: 'month', cadenceInterval: 1 },
      ]);

      await expect(service.findAll(42)).resolves.toMatchObject([
        {
          id: 12,
          gainLossAmount: 25,
          gainLossPercentage: 25,
          activeContributionPlan: { id: 31, amount: 40, status: 'active' },
        },
      ]);

      expect(investmentEventsService.findAllByInvestment).not.toHaveBeenCalled();
    });

    it('derives current value from investment events when no stored value exists', async () => {
      repository.findAll.mockResolvedValue([
        { id: 12, status: 'active', totalInvested: 100, currentValue: null, currency: 'USD' },
      ]);
      investmentEventsService.findAllByInvestment.mockResolvedValue([
        { eventType: InvestmentEventType.CONTRIBUTION, status: 'CONFIRMED', amount: 100 },
      ]);
      analyticsEngine.deriveEventValuation.mockReturnValue({
        totalInvested: 100,
        currentValue: 115,
        currentValueSource: 'event_derived',
      });

      await expect(service.findAll(42)).resolves.toMatchObject([
        { id: 12, totalInvested: 100, currentValue: 115, gainLossAmount: 15 },
      ]);

      expect(investmentEventsService.findAllByInvestment).toHaveBeenCalledWith('12');
      expect(analyticsEngine.deriveEventValuation).toHaveBeenCalledWith(
        expect.any(Array),
        undefined,
      );
    });
  });

  describe('findPage', () => {
    it('returns an empty page with pagination metadata', async () => {
      const query = { page: 2, limit: 10 };
      repository.findPage.mockResolvedValue({ items: [], total: 0 });

      await expect(service.findPage(42, query as never)).resolves.toEqual({
        data: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0, hasNextPage: false },
      });

      expect(repository.findPage).toHaveBeenCalledWith(42, query);
      expect(contributionPlansService.findAllByInvestmentIds).toHaveBeenCalledWith([]);
    });

    it('returns mapped investments with page metadata', async () => {
      const query = { page: 1, limit: 10 };
      repository.findPage.mockResolvedValue({ items: [{ ...createInput(), id: 12 }], total: 1 });
      contributionPlansService.findAllByInvestmentIds.mockResolvedValue([]);

      await expect(service.findPage(42, query as never)).resolves.toMatchObject({
        data: [{ id: 12, gainLossAmount: 25 }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false },
      });

      expect(contributionPlansService.findAllByInvestmentIds).toHaveBeenCalledWith([12]);
    });
  });

  describe('getDashboardAnalytics', () => {
    it('rejects aggregating investments held in different currencies', async () => {
      repository.findAllForPortfolio.mockResolvedValue([
        { id: 12, name: 'Fund', status: 'active', currency: 'USD', currentValue: 100 },
        { id: 13, name: 'Bond', status: 'active', currency: 'EUR', currentValue: 100 },
      ]);

      await expect(service.getDashboardAnalytics(42)).rejects.toThrow(
        'Portfolio analytics cannot aggregate different currencies without an exchange-rate policy. Holdings remain available separately.',
      );

      expect(repository.findAllForPortfolio).toHaveBeenCalledTimes(2);
      expect(investmentEventsService.findAllByInvestment).not.toHaveBeenCalled();
    });

    it('marks missing investment valuations as stale but not value-less insurance savings', async () => {
      repository.findAllForPortfolio.mockResolvedValue([
        { ...createInput(), id: 12, currentValueSource: undefined },
        {
          ...createInput({ currentValue: 0 }),
          id: 13,
          accountingTreatment: 'INSURANCE_SAVINGS',
          currentValueSource: 'manual',
        },
      ]);

      await expect(service.getDashboardAnalytics(42)).resolves.toMatchObject({
        widgets: {
          sourceOfValue: {
            snapshotBackedValue: 0,
            snapshotBackedCount: 0,
            snapshotBackedIds: [],
            estimatedValue: 0,
            estimatedCount: 1,
            estimatedIds: [13],
            investedOnlyValue: 125,
            investedOnlyCount: 1,
            investedOnlyIds: [12],
            staleValuationCount: 1,
            staleValuationValue: 125,
            staleValuationIds: [12],
            insuranceSavingsWithValueCount: 0,
            insuranceSavingsWithValueValue: 0,
            insuranceSavingsWithValueIds: [],
            insuranceSavingsWithoutValueCount: 1,
            insuranceSavingsWithoutValueIds: [13],
          },
        },
      });
    });

    it('returns portfolio KPI totals for a single-currency investment set', async () => {
      repository.findAllForPortfolio.mockResolvedValue([
        { ...createInput(), id: 12, currentValueSource: 'valuation_snapshot' },
      ]);

      const result = await service.getDashboardAnalytics(42) as {
        responseContext: { currency: string };
        widgets: { kpis: { currentPortfolioValue: { value: number; investments: number; returnAmount: number } } };
      };

      expect(result.responseContext.currency).toBe('USD');
      expect(result.widgets.kpis.currentPortfolioValue).toMatchObject({
        value: 125,
        investments: 125,
        returnAmount: 25,
      });
      expect(analyticsEngine.loadFacts).toHaveBeenCalledWith(42, expect.any(Array));
      expect(analyticsEngine.calculate).toHaveBeenCalledTimes(2);
    });

    it('separates investment, savings, and protection totals across confirmed analytics facts', async () => {
      const today = new Date();
      const upcomingDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentValuation = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const fiscalYearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      const fiscalLabel = `FY ${fiscalYearStart}-${String(fiscalYearStart + 1).slice(-2)}`;
      const fiscalPeriod = {
        key: fiscalLabel,
        label: fiscalLabel,
        startDate: new Date(fiscalYearStart, 3, 1),
        endDate: new Date(fiscalYearStart + 1, 2, 31),
      };
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyPeriod = {
        key: `${currentMonth.toLocaleString('en-US', { month: 'short' })} ${today.getFullYear()}`,
        label: `${currentMonth.toLocaleString('en-US', { month: 'short' })} ${today.getFullYear()}`,
        startDate: currentMonth,
        endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      };
      const investments = [
        {
          ...createInput({ startDate: '2026-04-01', totalInvested: 100, currentValue: 120 }),
          id: 12,
          accountingTreatment: 'INVESTMENT',
          currentValueSource: 'valuation_snapshot',
          lastValuationAt: recentValuation,
          maturityDate: upcomingDate,
          createdAt: '2026-04-01',
        },
        {
          ...createInput({ startDate: '2026-04-01', totalInvested: 200, currentValue: 250 }),
          id: 13,
          assetType: 'INSURANCE',
          assetCategory: 'SAVINGS',
          accountingTreatment: 'INSURANCE_SAVINGS',
          currentValueSource: 'manual',
          lastValuationAt: recentValuation,
          insuranceCover: 5000,
          maturityDate: upcomingDate,
          createdAt: '2026-05-01',
        },
        {
          ...createInput({ startDate: '2026-04-01', totalInvested: 50, currentValue: 0 }),
          id: 14,
          assetType: 'INSURANCE',
          assetCategory: 'PROTECTION',
          accountingTreatment: 'PROTECTION_EXPENSE',
          insuranceCover: 10000,
          maturityDate: upcomingDate,
          createdAt: '2026-06-01',
        },
      ];
      repository.findAllForPortfolio.mockResolvedValue(investments);
      contributionPlansService.findAllByInvestmentIds.mockResolvedValue([
        {
          id: 31,
          investmentId: 12,
          status: 'active',
          amount: 25,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          nextDueDate: upcomingDate,
        },
      ]);
      analyticsEngine.loadFacts.mockResolvedValue({
        events: [
          { investmentId: 12, eventType: InvestmentEventType.CONTRIBUTION, status: 'CONFIRMED', amount: 100 },
          { investmentId: 13, eventType: InvestmentEventType.PREMIUM, status: 'CONFIRMED', amount: 200 },
          { investmentId: 14, eventType: InvestmentEventType.PREMIUM, status: 'CONFIRMED', amount: 50 },
          { investmentId: 13, eventType: InvestmentEventType.PREMIUM, status: 'PENDING', amount: 999 },
        ],
        snapshots: [
          { investmentId: 12, snapshotDate: '2026-10-01', marketValue: 110 },
          { investmentId: 12, snapshotDate: '2026-11-01', marketValue: 120 },
        ],
      });
      analyticsEngine.calculate
        .mockResolvedValueOnce([
          { period: fiscalPeriod, invested: 100, return: 20, investedBreakdown: { EQUITY: 100 }, returnBreakdown: { EQUITY: 20 } },
        ])
        .mockResolvedValueOnce([
          { period: monthlyPeriod, invested: 100, return: 20, investedBreakdown: { EQUITY: 100 }, returnBreakdown: { EQUITY: 20 } },
        ]);
      analyticsEngine.resolveInvestmentValueAtDate.mockImplementation(
        (investment: { currentValue?: number }) => ({ value: Number(investment.currentValue || 0), source: 'snapshot' }),
      );

      await expect(service.getDashboardAnalytics(42)).resolves.toMatchObject({
        widgets: {
          kpis: {
            totalContributions: { value: 300, investments: 100, insuranceSavings: 200 },
            currentPortfolioValue: { value: 370, investments: 120, insuranceSavings: 250, returnAmount: 20 },
            upcomingMaturity: { value: 370, investments: 120, insuranceSavings: 250 },
            insuranceCover: { value: 15000, protection: 10000, savingsLinked: 5000 },
            insurancePremiumsPaid: { value: 250, savingsLinked: 200, protection: 50 },
          },
          sourceOfValue: {
            snapshotBackedValue: 120,
            snapshotBackedCount: 1,
            snapshotBackedIds: [12],
            estimatedValue: 250,
            estimatedCount: 1,
            estimatedIds: [13],
            investedOnlyValue: 0,
            investedOnlyCount: 1,
            investedOnlyIds: [14],
            staleValuationCount: 0,
            staleValuationValue: 0,
            staleValuationIds: [],
            insuranceSavingsWithValueCount: 1,
            insuranceSavingsWithValueValue: 250,
            insuranceSavingsWithValueIds: [13],
            insuranceSavingsWithoutValueCount: 0,
            insuranceSavingsWithoutValueIds: [],
          },
          capitalDeployment: {
            order: [fiscalLabel],
            monthlyByYear: { [fiscalLabel]: [expect.objectContaining({ period: monthlyPeriod })] },
          },
          upcomingContributions: [expect.objectContaining({ id: 12 })],
          topHoldings: [expect.objectContaining({ id: 13 }), expect.objectContaining({ id: 12 })],
          upcomingMaturities: expect.arrayContaining([
            expect.objectContaining({ id: 12 }),
            expect.objectContaining({ id: 13 }),
            expect.objectContaining({ id: 14 }),
          ]),
          assetTypePerformance: { rows: [expect.objectContaining({ key: 'EQUITY' })] },
          allocationMix: { rows: [expect.objectContaining({ key: 'STOCK' })] },
          assets: expect.arrayContaining([
            expect.objectContaining({ id: 13, premiumsPaid: 200 }),
            expect.objectContaining({ id: 14, premiumsPaid: 50 }),
          ]),
        },
      });
    });
  });

  describe('findDetailShell', () => {
    it('returns null without loading related data for an investment the user cannot access', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findDetailShell(12, 42)).resolves.toBeNull();

      expect(repository.findOne).toHaveBeenCalledWith(12, 42);
      expect(contributionPlansService.findAllByInvestment).not.toHaveBeenCalled();
      expect(investmentEventsService.findAllByInvestment).not.toHaveBeenCalled();
    });

    it('includes realized benefit metrics and the latest snapshot for a closed investment', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'closed' });
      investmentEventsService.findAllByInvestment.mockResolvedValue([
        { eventType: InvestmentEventType.BENEFIT_RECEIPT, status: 'CONFIRMED', amount: 125 },
        { eventType: InvestmentEventType.BENEFIT_RECEIPT, status: 'PENDING', amount: 50 },
      ]);
      valuationSnapshotsService.findAllByInvestment.mockResolvedValue([
        { id: 8, snapshotDate: '2026-10-01T00:00:00.000Z', marketValue: 125 },
      ]);

      await expect(service.findDetailShell(12, 42)).resolves.toMatchObject({
        id: 12,
        currentValue: 0,
        realizedAmount: 125,
        realizedProfitLoss: 25,
        realizedProfitLossPercentage: 25,
        eventCount: 2,
        snapshotCount: 1,
        latestSnapshot: { id: 8, marketValue: 125 },
      });

      expect(contributionPlansService.findAllByInvestment).toHaveBeenCalledWith('12');
      expect(investmentEventsService.findAllByInvestment).toHaveBeenCalledWith('12');
      expect(valuationSnapshotsService.findAllByInvestment).toHaveBeenCalledWith('12');
    });
  });

  describe('getPerformance', () => {
    it('returns null without loading history for an investment the user cannot access', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getPerformance(12, 42)).resolves.toBeNull();

      expect(repository.findOne).toHaveBeenCalledWith(12, 42);
      expect(investmentEventsService.findAllByInvestment).not.toHaveBeenCalled();
      expect(valuationSnapshotsService.findAllByInvestment).not.toHaveBeenCalled();
    });

    it('calculates snapshot performance from confirmed principal events', async () => {
      repository.findOne.mockResolvedValue({ id: 12, totalInvested: 100 });
      investmentEventsService.findAllByInvestment.mockResolvedValue([
        { eventType: InvestmentEventType.CONTRIBUTION, status: 'CONFIRMED', eventDate: '2026-01-01', amount: 100 },
        { eventType: InvestmentEventType.INCOME_CREDIT, status: 'CONFIRMED', eventDate: '2026-01-15', amount: 10 },
        { eventType: InvestmentEventType.CONTRIBUTION, status: 'PENDING', eventDate: '2026-01-20', amount: 50 },
      ]);
      valuationSnapshotsService.findAllByInvestment.mockResolvedValue([
        { id: 8, snapshotDate: '2026-01-31', marketValue: 120 },
      ]);

      await expect(service.getPerformance(12, 42)).resolves.toMatchObject({
        investmentId: 12,
        performanceHistorySource: 'valuation_snapshot',
        performanceHistory: [
          {
            date: '2026-01-31',
            currentValue: 120,
            investedValue: 100,
            gainLossValue: 20,
            gainLossPercentage: 20,
          },
        ],
      });
    });

    it('builds event-based performance when no valuation snapshots exist', async () => {
      repository.findOne.mockResolvedValue({ id: 12, totalInvested: 0 });
      investmentEventsService.findAllByInvestment.mockResolvedValue([
        { eventType: InvestmentEventType.CONTRIBUTION, status: 'CONFIRMED', eventDate: '2026-01-01', amount: 100 },
        { eventType: InvestmentEventType.INCOME_CREDIT, status: 'CONFIRMED', eventDate: '2026-01-02', amount: 10 },
        { eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, status: 'CONFIRMED', eventDate: '2026-01-03', amount: 20 },
        { eventType: InvestmentEventType.CONTRIBUTION, status: 'PENDING', eventDate: '2026-01-04', amount: 50 },
      ]);

      await expect(service.getPerformance(12, 42)).resolves.toMatchObject({
        investmentId: 12,
        performanceHistorySource: 'investment_event',
        performanceHistory: [
          { investedValue: 100, currentValue: 100, gainLossValue: 0 },
          { investedValue: 100, currentValue: 110, gainLossValue: 10 },
          { investedValue: 80, currentValue: 90, gainLossValue: 10, gainLossPercentage: 12.5 },
        ],
      });
      expect(valuationSnapshotsService.findAllByInvestment).toHaveBeenCalledWith('12');
    });
  });

  describe('findOne', () => {
    it('returns the detail shell for the requested investment', async () => {
      const detail = { id: 12 } as never;
      const findDetailShell = vi.spyOn(service, 'findDetailShell').mockResolvedValue(detail);

      await expect(service.findOne(12, 42)).resolves.toBe(detail);

      expect(findDetailShell).toHaveBeenCalledWith(12, 42);
    });
  });

  describe('update', () => {
    it('returns null when the user does not own the investment', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(12, { name: 'Updated fund' } as never, 42)).resolves.toBeNull();

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates editable details after validating the linked account and classification', async () => {
      const existing = { ...createInput(), id: 12 };
      const update = { name: 'Updated index fund' };
      repository.findOne.mockResolvedValue(existing);
      repository.update.mockResolvedValue({ id: 12, name: update.name });

      await expect(service.update(12, update as never, 42)).resolves.toEqual({ id: 12, name: update.name });

      expect(prisma.financialAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 9, userId: 42 },
        select: { id: true, currency: true },
      });
      expect(repository.update).toHaveBeenCalledWith(12, update, 42, transaction);
    });

    it('rejects closing an investment outside the benefit realization flow', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });

      await expect(service.update(12, { status: 'closed' } as never, 42)).rejects.toThrow(
        'Investments must be closed through benefit realization so settlement and cash movement are recorded.',
      );

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects direct changes to invested principal or valuation fields', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });

      await expect(service.update(12, { currentValue: 200 } as never, 42)).rejects.toThrow(
        'Change principal through investment activity and valuation through snapshots. Investment currency cannot be changed.',
      );

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects expected-benefit changes through the investment update endpoint', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });

      await expect(
        service.update(12, { expectedBenefits: [] } as never, 42),
      ).rejects.toThrow('Manage existing investment benefits through the benefits endpoints.');

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates a recurring plan only when it belongs to the investment', async () => {
      const update = { recurringPlanId: 31, recurringPlanUpdate: { amount: 150 } };
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });
      repository.update.mockResolvedValue({ id: 12 });
      transaction.investmentContributionPlan.findFirst.mockResolvedValue({ id: 31, investmentId: 12 });

      await service.update(12, update as never, 42);

      expect(transaction.investmentContributionPlan.findFirst).toHaveBeenCalledWith({
        where: { id: 31, investmentId: 12 },
      });
      expect(contributionPlansService.update).toHaveBeenCalledWith(
        '31',
        update.recurringPlanUpdate,
        42,
        transaction,
      );
    });

    it('rejects recurring-plan reassignment through an investment edit', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });
      transaction.investmentContributionPlan.findFirst.mockResolvedValue({ id: 31, investmentId: 12 });

      await expect(
        service.update(
          12,
          { recurringPlanId: 31, recurringPlanUpdate: { investmentId: '13' } } as never,
          42,
        ),
      ).rejects.toThrow('Recurring plans cannot be reassigned through investment edits.');

      expect(contributionPlansService.update).not.toHaveBeenCalled();
    });

    it('pauses active recurring plans when an investment matures', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });
      repository.update.mockResolvedValue({ id: 12, status: 'matured' });
      contributionPlansService.findAllByInvestment.mockResolvedValue([
        { id: 31, status: 'active' },
        { id: 32, status: 'paused' },
      ]);

      await expect(service.update(12, { status: 'matured' } as never, 42)).resolves.toEqual({
        id: 12,
        status: 'matured',
      });

      expect(contributionPlansService.update).toHaveBeenCalledTimes(1);
      expect(contributionPlansService.update).toHaveBeenCalledWith(
        '31',
        { status: 'paused' },
        42,
        transaction,
      );
    });
  });

  describe('remove', () => {
    it('returns null without deleting an investment the user does not own', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(12, 42)).resolves.toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith(12, 42);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting a closed investment', async () => {
      repository.findOne.mockResolvedValue({ id: 12, status: ' Closed ' });

      await expect(service.remove(12, 42)).rejects.toThrow('Closed investments cannot be modified.');
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an owned investment that is still open', async () => {
      repository.findOne.mockResolvedValue({ id: 12, status: 'active' });

      await expect(service.remove(12, 42)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(12, 42);
    });
  });
});