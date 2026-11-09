import { InvestmentEventType } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InvestmentEventsService } from '../../investment-events/investment-events.service';
import type { ValuationSnapshotsService } from '../../valuation-snapshots/valuation-snapshots.service';
import type { EventLike, SnapshotLike, SummaryInvestment } from '../investment.types';
import { AnalyticsEngineService } from './analytics-engine.service';
import type { AnalyticsFacts, AnalyticsQuery } from './analytics.types';

function createService() {
  return new AnalyticsEngineService({} as never, {} as never);
}

function event(overrides: Partial<EventLike> = {}): EventLike {
  return {
    status: 'CONFIRMED',
    investmentId: 1,
    eventType: InvestmentEventType.CONTRIBUTION,
    eventDate: new Date('2026-01-01T00:00:00.000Z'),
    amount: 100,
    ...overrides,
  };
}

function investment(overrides: Partial<SummaryInvestment> = {}): SummaryInvestment {
  return {
    id: 1,
    userId: 7,
    accountId: null,
    assetTaxonomyId: null,
    assetTypeMetaId: 1,
    assetCategoryMetaId: 1,
    name: 'Portfolio holding',
    assetType: 'EQUITY',
    assetCategory: 'STOCK',
    accountingTreatment: 'INVESTMENT',
    accountingTreatmentOverride: null,
    institutionName: null,
    referenceNumber: null,
    status: 'ACTIVE',
    currency: 'INR',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    maturityDate: null,
    totalInvested: 100,
    currentValue: 120,
    currentValueSource: null,
    lastValuationAt: null,
    insuranceCover: null,
    contributionMode: 'MANUAL',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function snapshot(overrides: Partial<SnapshotLike> = {}): SnapshotLike {
  return {
    id: 1,
    investmentId: 1,
    snapshotDate: new Date('2026-01-31T23:59:59.999Z'),
    marketValue: 150,
    ...overrides,
  };
}

function query(overrides: Partial<AnalyticsQuery> = {}): AnalyticsQuery {
  return {
    range: 'ALL',
    granularity: 'MONTH',
    calendar: 'FISCAL',
    fiscalYearStartMonth: 3,
    from: new Date('2026-01-01T00:00:00.000Z'),
    to: new Date('2026-01-31T23:59:59.999Z'),
    ...overrides,
  };
}

describe('AnalyticsEngineService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculate', () => {
    it('reconciles monthly activity, principal, income and withdrawals at inclusive date boundaries', async () => {
      const facts: AnalyticsFacts = {
        investments: [investment()],
        snapshots: [],
        events: [
          event({ eventDate: '2025-12-31T23:59:59.999Z', amount: 40 }),
          event({ eventType: InvestmentEventType.OPENING_BALANCE, amount: 100 }),
          event({ eventDate: '2026-01-31T23:59:59.999Z', amount: 50 }),
          event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: 10 }),
          event({ eventType: InvestmentEventType.OPENING_INCOME_CREDIT, amount: 5 }),
          event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 20 }),
          event({ eventDate: '2026-02-01T00:00:00.000Z', amount: 30 }),
          event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, eventDate: '2026-02-28T23:59:59.999Z', amount: 15 }),
          event({ eventType: InvestmentEventType.INCOME_CREDIT, eventDate: '2026-03-15T12:00:00.000Z', amount: 2 }),
          event({ eventDate: '2026-03-15T12:00:00.001Z', amount: 999 }),
          event({ status: 'PENDING', amount: 999 }),
          event({ status: null, amount: 999 }),
          event({ eventDate: null, amount: 999 }),
          event({ eventType: null, amount: 999 }),
          event({ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 999 }),
        ],
      };

      const points = await createService().calculate(query({ to: new Date('2026-03-15T12:00:00.000Z') }), facts);

      expect(points.map((point) => point.period.key)).toEqual(['2026-01', '2026-02', '2026-03']);
      expect(points.map((point) => point.activity)).toEqual([
        { newContribution: 150, newWithdrawal: 20, newPremium: 0, newIncomeCredit: 15, netCashFlow: 130 },
        { newContribution: 30, newWithdrawal: 15, newPremium: 0, newIncomeCredit: 0, netCashFlow: 15 },
        { newContribution: 0, newWithdrawal: 0, newPremium: 0, newIncomeCredit: 2, netCashFlow: 0 },
      ]);
      expect(points.map((point) => point.state)).toEqual([
        { cumulativeInvested: 170, cumulativeWithdrawn: 20, portfolioValue: 185, returnAmount: 15 },
        { cumulativeInvested: 185, cumulativeWithdrawn: 35, portfolioValue: 200, returnAmount: 15 },
        { cumulativeInvested: 185, cumulativeWithdrawn: 35, portfolioValue: 202, returnAmount: 17 },
      ]);
      expect(points[2].breakdown).toEqual({ invested: { EQUITY: 185 }, returns: { EQUITY: 17 } });
      expect(points[2].valueSources).toEqual({ snapshot: 0, derived: 202, invested: 0 });
      expect(points.map((point) => point.dataQuality)).toEqual(Array(3).fill({ cashFlow: 'complete', portfolioValue: 'derived' }));
    });

    it('aggregates asset classes and reconciles snapshot, estimated and invested value sources', async () => {
      const points = await createService().calculate(query(), {
        investments: [
          investment({ totalInvested: 100 }),
          investment({ id: 2, totalInvested: 50, currentValue: 40, lastValuationAt: new Date('2026-01-15T00:00:00.000Z') }),
          investment({ id: 3, assetType: 'BOND', totalInvested: 200 }),
          investment({ id: 4, assetType: undefined, totalInvested: 25 }),
          investment({ id: 5, startDate: new Date('2026-02-01T00:00:00.000Z'), totalInvested: 900 }),
        ],
        events: [],
        snapshots: [snapshot({ investmentId: '1', marketValue: 130 })],
      });

      expect(points[0]).toMatchObject({
        activity: { newContribution: 0, newWithdrawal: 0, newPremium: 0, newIncomeCredit: 0, netCashFlow: 0 },
        state: { cumulativeInvested: 375, cumulativeWithdrawn: 0, portfolioValue: 395, returnAmount: 20 },
        breakdown: { invested: { EQUITY: 150, BOND: 200, OTHER: 25 }, returns: { EQUITY: 20, BOND: 0, OTHER: 0 } },
        valueSources: { snapshot: 130, derived: 40, invested: 225 },
        dataQuality: { cashFlow: 'complete', portfolioValue: 'observed' },
      });
    });

    it('counts savings premiums as cash flow but values savings only when a snapshot exists and excludes protection', async () => {
      const points = await createService().calculate(query({ to: new Date('2026-02-28T23:59:59.999Z') }), {
        investments: [
          investment({ accountingTreatment: 'INSURANCE_SAVINGS', assetType: 'INSURANCE' }),
          investment({ id: 2, accountingTreatment: 'PROTECTION_EXPENSE', totalInvested: 5000 }),
        ],
        events: [
          event({ eventType: InvestmentEventType.PREMIUM, amount: 100 }),
          event({ eventType: InvestmentEventType.CONTRIBUTION, amount: 50 }),
          event({ eventType: InvestmentEventType.OPENING_BALANCE, amount: 25 }),
          event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 10 }),
          event({ investmentId: 2, eventType: InvestmentEventType.PREMIUM, amount: 5000 }),
        ],
        snapshots: [snapshot({ snapshotDate: '2026-02-01T00:00:00.000Z', marketValue: 150 }), snapshot({ investmentId: 2, marketValue: 9000 })],
      });

      expect(points[0]).toMatchObject({
        activity: { newContribution: 0, newWithdrawal: 10, newPremium: 175, newIncomeCredit: 0, netCashFlow: 165 },
        state: { cumulativeInvested: 0, cumulativeWithdrawn: 10, portfolioValue: 0, returnAmount: 0 },
        breakdown: { invested: {}, returns: {} },
        valueSources: { snapshot: 0, derived: 0, invested: 0 },
        dataQuality: { cashFlow: 'complete', portfolioValue: 'unknown' },
      });
      expect(points[1]).toMatchObject({
        activity: { newContribution: 0, newWithdrawal: 0, newPremium: 0, newIncomeCredit: 0, netCashFlow: 0 },
        state: { cumulativeInvested: 175, cumulativeWithdrawn: 10, portfolioValue: 150, returnAmount: -25 },
        breakdown: { invested: { INSURANCE: 175 }, returns: { INSURANCE: -25 } },
        valueSources: { snapshot: 150, derived: 0, invested: 0 },
        dataQuality: { cashFlow: 'complete', portfolioValue: 'observed' },
      });
    });

    it('uses stored savings principal only for holdings that have started and have an observed value', async () => {
      const points = await createService().calculate(query(), {
        investments: [
          investment({ accountingTreatment: 'INSURANCE_SAVINGS', assetType: 'INSURANCE' }),
          investment({ id: 2, accountingTreatment: 'INSURANCE_SAVINGS', assetType: 'INSURANCE', startDate: null }),
          investment({ id: 3, accountingTreatment: 'INSURANCE_SAVINGS', assetType: 'INSURANCE', totalInvested: undefined }),
        ],
        events: [],
        snapshots: [snapshot({ marketValue: 70 }), snapshot({ investmentId: 2, marketValue: 0 }), snapshot({ investmentId: 3, marketValue: 0 })],
      });

      expect(points[0]).toMatchObject({
        state: { cumulativeInvested: 100, cumulativeWithdrawn: 0, portfolioValue: 70, returnAmount: -30 },
        breakdown: { invested: { INSURANCE: 100 }, returns: { INSURANCE: -30 } },
        valueSources: { snapshot: 70, derived: 0, invested: 0 },
        dataQuality: { cashFlow: 'complete', portfolioValue: 'observed' },
      });
    });

    it('defaults legacy holdings without an accounting treatment to ordinary investment contributions', async () => {
      const points = await createService().calculate(query(), {
        investments: [investment({ accountingTreatment: undefined })],
        events: [event({ investmentId: '1', amount: 25 })],
        snapshots: [],
      });

      expect(points[0].activity).toEqual({ newContribution: 25, newWithdrawal: 0, newPremium: 0, newIncomeCredit: 0, netCashFlow: 25 });
      expect(points[0].state).toEqual({ cumulativeInvested: 25, cumulativeWithdrawn: 0, portfolioValue: 25, returnAmount: 0 });
    });

    it('returns zero states and marks empty later periods as carried forward', async () => {
      const points = await createService().calculate(query({ to: new Date('2026-02-01T00:00:00.000Z') }), {
        investments: [], events: [], snapshots: [],
      });

      expect(points).toHaveLength(2);
      for (const point of points) {
        expect(point.activity).toEqual({ newContribution: 0, newWithdrawal: 0, newPremium: 0, newIncomeCredit: 0, netCashFlow: 0 });
        expect(point.state).toEqual({ cumulativeInvested: 0, cumulativeWithdrawn: 0, portfolioValue: 0, returnAmount: 0 });
        expect(point.breakdown).toEqual({ invested: {}, returns: {} });
        expect(point.valueSources).toEqual({ snapshot: 0, derived: 0, invested: 0 });
      }
      expect(points.map((point) => point.dataQuality.portfolioValue)).toEqual(['unknown', 'carried_forward']);
    });

    it('labels invested-only values as carried forward rather than observed or event-derived', async () => {
      const points = await createService().calculate(query(), {
        investments: [investment()],
        events: [event({ status: undefined }), event({ eventDate: undefined })],
        snapshots: [snapshot({ snapshotDate: null }), snapshot({ snapshotDate: '2026-02-01T00:00:00.000Z' })],
      });

      expect(points[0].state).toEqual({ cumulativeInvested: 100, cumulativeWithdrawn: 0, portfolioValue: 100, returnAmount: 0 });
      expect(points[0].valueSources).toEqual({ snapshot: 0, derived: 0, invested: 100 });
      expect(points[0].dataQuality).toEqual({ cashFlow: 'complete', portfolioValue: 'carried_forward' });
    });

    it('groups cash flow by fiscal year without double-counting the year boundary', async () => {
      const points = await createService().calculate(query({
        granularity: 'YEAR', from: new Date('2025-04-01T00:00:00.000Z'), to: new Date('2026-04-01T00:00:00.000Z'),
      }), {
        investments: [investment({ startDate: new Date('2025-04-01T00:00:00.000Z') })],
        snapshots: [],
        events: [event({ eventDate: '2026-03-31T23:59:59.999Z', amount: 100 }), event({ eventDate: '2026-04-01T00:00:00.000Z', amount: 50 })],
      });

      expect(points.map((point) => point.period.key)).toEqual(['2025', '2026']);
      expect(points.map((point) => point.activity.newContribution)).toEqual([100, 50]);
      expect(points.map((point) => point.state.cumulativeInvested)).toEqual([100, 150]);
    });

    it('uses the earliest confirmed event, snapshot or investment start when the lower bound is omitted', async () => {
      const points = await createService().calculate(query({ from: undefined }), {
        investments: [investment({ startDate: new Date('2025-12-15T00:00:00.000Z') })],
        snapshots: [snapshot({ snapshotDate: '2025-11-15T00:00:00.000Z' })],
        events: [event({ status: 'confirmed', eventDate: '2025-10-15T00:00:00.000Z', amount: 25 }), event({ status: 'PENDING', eventDate: '2020-01-01T00:00:00.000Z' })],
      });

      expect(points.map((point) => point.period.key)).toEqual(['2025-10', '2025-11', '2025-12', '2026-01']);
      expect(points[0].activity.newContribution).toBe(25);
      expect(points.map((point) => point.dataQuality.portfolioValue)).toEqual(['derived', 'observed', 'observed', 'observed']);
    });

    it('treats missing cash-flow amounts as zero', async () => {
      const points = await createService().calculate(query(), {
        investments: [investment()], snapshots: [],
        events: [
          event({ amount: null }),
          event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: undefined }),
          event({ eventType: InvestmentEventType.PREMIUM, amount: null }),
          event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: undefined }),
        ],
      });

      expect(points[0].activity).toEqual({ newContribution: 0, newWithdrawal: 0, newPremium: 0, newIncomeCredit: 0, netCashFlow: 0 });
      expect(points[0].state).toEqual({ cumulativeInvested: 0, cumulativeWithdrawn: 0, portfolioValue: 0, returnAmount: 0 });
    });

    it('returns no points for an inverted reporting range', async () => {
      await expect(createService().calculate(query({ from: new Date('2026-02-01T00:00:00.000Z') }), {
        investments: [], events: [], snapshots: [],
      })).resolves.toEqual([]);
    });
  });

  describe('loadFacts', () => {
    function setup() {
      const eventsService = { findAll: vi.fn().mockResolvedValue([]) };
      const snapshotsService = { findAll: vi.fn().mockResolvedValue([]) };
      const service = new AnalyticsEngineService(
        eventsService as unknown as InvestmentEventsService,
        snapshotsService as unknown as ValuationSnapshotsService,
      );
      return { service, eventsService, snapshotsService };
    }

    it('loads the user facts, matches numeric identifiers and excludes unrelated and future records', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'));
      const { service, eventsService, snapshotsService } = setup();
      const holdings = [investment()];
      const includedEvents = [event({ investmentId: '1', eventDate: '2026-02-01T00:00:00.000Z' }), event({ eventDate: null }), event({ status: 'PENDING' })];
      const includedSnapshots = [snapshot({ investmentId: '1', snapshotDate: '2026-02-01T00:00:00.000Z' }), snapshot({ snapshotDate: null })];
      const allEvents = [...includedEvents, event({ investmentId: 2 }), event({ eventDate: '2026-02-01T00:00:00.001Z' })];
      const allSnapshots = [...includedSnapshots, snapshot({ investmentId: 2 }), snapshot({ snapshotDate: '2026-02-01T00:00:00.001Z' })];
      eventsService.findAll.mockResolvedValue(allEvents);
      snapshotsService.findAll.mockResolvedValue(allSnapshots);

      await expect(service.loadFacts(7, holdings)).resolves.toEqual({ investments: holdings, events: includedEvents, snapshots: includedSnapshots });
      expect(eventsService.findAll).toHaveBeenCalledExactlyOnceWith(7);
      expect(snapshotsService.findAll).toHaveBeenCalledExactlyOnceWith(7);
      expect(allEvents).toHaveLength(5);
      expect(allSnapshots).toHaveLength(4);
    });

    it('returns empty facts when none of the loaded records belong to the requested investments', async () => {
      const { service, eventsService, snapshotsService } = setup();
      eventsService.findAll.mockResolvedValue([event()]);
      snapshotsService.findAll.mockResolvedValue([snapshot()]);

      await expect(service.loadFacts(7, [])).resolves.toEqual({ investments: [], events: [], snapshots: [] });
    });

    it.each(['events', 'snapshots'] as const)('propagates %s loading failures without returning partial facts', async (dependency) => {
      const { service, eventsService, snapshotsService } = setup();
      const error = new Error('Facts unavailable');
      (dependency === 'events' ? eventsService : snapshotsService).findAll.mockRejectedValue(error);

      await expect(service.loadFacts(7, [investment()])).rejects.toBe(error);
    });
  });

  describe('resolveInvestmentValueAtDate', () => {
    const pointDate = new Date('2026-01-31T23:59:59.999Z');

    it('selects the latest eligible snapshot over events and stored valuations without reordering inputs', () => {
      const snapshots = [
        snapshot({ id: 1, marketValue: 110, snapshotDate: '2026-01-10T00:00:00.000Z' }),
        snapshot({ id: 2, marketValue: 999, snapshotDate: '2026-02-01T00:00:00.000Z' }),
        snapshot({ id: 3, marketValue: 130 }),
        snapshot({ id: 4, marketValue: 999, snapshotDate: null }),
        snapshot({ id: 5, marketValue: 120, snapshotDate: '2026-01-20T00:00:00.000Z' }),
      ];

      expect(createService().resolveInvestmentValueAtDate(
        investment({ lastValuationAt: new Date('2026-01-20T00:00:00.000Z'), currentValue: 500 }), snapshots, pointDate, [event({ amount: 300 })],
      )).toEqual({ value: 130, source: 'snapshot' });
      expect(snapshots.map((entry) => entry.id)).toEqual([1, 2, 3, 4, 5]);
    });

    it.each([null, undefined, 0])('preserves a zero snapshot value when the market value is %s', (marketValue) => {
      expect(createService().resolveInvestmentValueAtDate(investment(), [snapshot({ marketValue })], pointDate, [event()]))
        .toEqual({ value: 0, source: 'snapshot' });
    });

    it('derives historical value only from confirmed dated events at or before the cutoff', () => {
      expect(createService().resolveInvestmentValueAtDate(investment({ currentValue: 999 }), [], pointDate, [
        event({ amount: 100 }),
        event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: 15, eventDate: pointDate }),
        event({ amount: 999, eventDate: '2026-02-01T00:00:00.000Z' }),
        event({ amount: 999, eventDate: null }),
        event({ amount: 999, status: 'PENDING' }),
      ])).toEqual({ value: 115, source: 'manual' });
    });

    it('does not estimate insurance savings from premium payments', () => {
      expect(createService().resolveInvestmentValueAtDate(investment({ accountingTreatment: 'INSURANCE_SAVINGS' }), [], pointDate, [
        event({ eventType: InvestmentEventType.PREMIUM, amount: 500 }),
      ])).toEqual({ value: 0, source: 'manual' });
    });

    it.each([0, 125])('uses an available stored valuation of %s at the cutoff when no event valuation exists', (currentValue) => {
      expect(createService().resolveInvestmentValueAtDate(investment({ lastValuationAt: pointDate, currentValue }), undefined, pointDate))
        .toEqual({ value: currentValue, source: 'estimated' });
    });

    it.each([
      { lastValuationAt: null, currentValue: 999 },
      { lastValuationAt: new Date('2026-02-01T00:00:00.000Z'), currentValue: 999 },
      { lastValuationAt: pointDate, currentValue: undefined },
    ])('falls back to invested principal when the stored valuation is unavailable: %j', (overrides) => {
      expect(createService().resolveInvestmentValueAtDate(investment({ ...overrides, startDate: pointDate }), [], pointDate))
        .toEqual({ value: 100, source: 'invested' });
    });

    it.each([
      { startDate: null },
      { startDate: new Date('2026-02-01T00:00:00.000Z') },
      { totalInvested: undefined },
    ])('returns zero without eligible invested principal: %j', (overrides) => {
      expect(createService().resolveInvestmentValueAtDate(investment(overrides), [], pointDate))
        .toEqual({ value: 0, source: 'invested' });
    });
  });

  describe('deriveEventValuation', () => {
    it('derives invested principal and current value from confirmed activity', () => {
      const valuation = createService().deriveEventValuation([
        event({ amount: 1000 }),
        event({ eventType: InvestmentEventType.OPENING_BALANCE, amount: 200 }),
        event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 250 }),
        event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: 30 }),
        event({
          eventType: InvestmentEventType.OPENING_INCOME_CREDIT,
          eventDate: new Date('2026-02-01T00:00:00.000Z'),
          amount: 10,
        }),
        event({ status: 'PENDING', amount: 5000 }),
      ]);

      expect(valuation).toMatchObject({
        totalInvested: 950,
        currentValue: 990,
        currentValueSource: 'manual',
      });
      expect(valuation?.lastValuationAt).toEqual(new Date('2026-02-01T00:00:00.000Z'));
    });

    it('treats insurance-savings premiums as invested principal without estimating a value', () => {
      const valuation = createService().deriveEventValuation(
        [
          event({ eventType: InvestmentEventType.PREMIUM, amount: 500 }),
          event({ eventType: InvestmentEventType.CONTRIBUTION, amount: 100 }),
          event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 50 }),
          event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: 25 }),
        ],
        'INSURANCE_SAVINGS',
      );

      expect(valuation).toMatchObject({
        totalInvested: 600,
        currentValue: 0,
        currentValueSource: 'manual',
      });
    });

    it('returns no valuation when there are no confirmed events or the treatment is protection expense', () => {
      expect(createService().deriveEventValuation([event({ status: 'PENDING' })])).toBeNull();
      expect(
        createService().deriveEventValuation([event()], 'PROTECTION_EXPENSE'),
      ).toBeNull();
    });

    it('returns no valuation for omitted events or missing confirmation statuses', () => {
      expect(createService().deriveEventValuation()).toBeNull();
      expect(createService().deriveEventValuation([event({ status: null }), event({ status: undefined })])).toBeNull();
    });

    it('accepts case-insensitive confirmation and preserves exact fractional cash-flow relationships', () => {
      expect(createService().deriveEventValuation([
        event({ status: 'confirmed', amount: 100.25 }),
        event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 20.5 }),
        event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: 0.75 }),
        event({ eventType: InvestmentEventType.PREMIUM, amount: 999 }),
      ])).toMatchObject({ totalInvested: 79.75, currentValue: 80.5 });
    });

    it('preserves negative net principal and current value when withdrawals exceed contributions', () => {
      expect(createService().deriveEventValuation([
        event({ amount: 20 }), event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 50 }),
      ])).toMatchObject({ totalInvested: -30, currentValue: -30 });
    });

    it.each(['INVESTMENT', 'INSURANCE_SAVINGS'] as const)('handles undated activity and missing amounts for %s', (treatment) => {
      expect(createService().deriveEventValuation([
        event({ amount: null, eventDate: null }),
        event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: undefined, eventDate: undefined }),
        event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: null, eventDate: null }),
      ], treatment)).toEqual({ totalInvested: 0, currentValue: 0, currentValueSource: 'manual', lastValuationAt: null });
    });

    it.each(['INVESTMENT', 'INSURANCE_SAVINGS'] as const)('finds the latest confirmed date without mutating input order for %s', (treatment) => {
      const events = [
        event({ id: 1, eventDate: '2026-01-01T00:00:00.000Z' }),
        event({ id: 2, eventDate: '2026-03-01T00:00:00.000Z' }),
        event({ id: 3, eventDate: null }),
        event({ id: 4, eventDate: '2026-02-01T00:00:00.000Z' }),
        event({ id: 5, status: 'PENDING', eventDate: '2026-04-01T00:00:00.000Z' }),
      ];

      expect(createService().deriveEventValuation(events, treatment)?.lastValuationAt).toBe('2026-03-01T00:00:00.000Z');
      expect(events.map((entry) => entry.id)).toEqual([1, 2, 3, 4, 5]);
    });
  });
});