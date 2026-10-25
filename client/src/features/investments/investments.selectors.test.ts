import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  getFilteredInvestments,
  getInvestmentContributionAllocation,
  getInvestmentContributionViewItems,
  getInvestmentDashboardKpis,
  getInvestmentMaturityLadderData,
  getInvestmentMonthlyTimeSeriesData,
  getInvestmentValueSourceSummary,
  getUpcomingMaturitiesAndBenefits,
  getInsurancePositionData,
} from './investments.selectors';
import type { Investment } from './types/investment.types';

const daysFromNow = (days: number) => dayjs().add(days, 'day').format('YYYY-MM-DD');

const investment = (overrides: Partial<Investment> = {}): Investment => ({
  id: 'fund-1',
  name: 'Index fund',
  type: 'MUTUAL_FUND',
  category: 'EQUITY',
  assetType: 'MUTUAL_FUND',
  assetCategory: 'EQUITY',
  institution: 'Broker',
  totalInvested: 1000,
  currentValue: 1200,
  startDate: dayjs().subtract(6, 'month').format('YYYY-MM-DD'),
  status: 'active',
  accountingTreatment: 'INVESTMENT',
  ...overrides,
});

describe('investment selectors', () => {
  it('separates accounting treatments in dashboard KPIs', () => {
    const result = getInvestmentDashboardKpis([
      investment({ id: 'investment', totalInvested: 1000, currentValue: 1200, lastValuationAt: daysFromNow(-1) }),
      investment({
        id: 'savings',
        accountingTreatment: 'INSURANCE_SAVINGS',
        totalInvested: 300,
        currentValue: 250,
        insuranceCover: 5000,
      }),
      investment({
        id: 'protection',
        accountingTreatment: 'PROTECTION_EXPENSE',
        totalInvested: 80,
        currentValue: 0,
        insuranceCover: 10000,
      }),
    ]);

    expect(result).toMatchObject({
      totalInvestments: 3,
      totalContributions: 1300,
      totalInvested: 1000,
      totalCurrentValue: 1200,
      totalReturn: 200,
      returnPercentage: 20,
      insuranceSavingsContribution: 300,
      protectionExpenseTotal: 80,
      insuranceCover: 15000,
      insuranceCoverSavings: 5000,
      insuranceCoverProtection: 10000,
    });
  });

  it('resolves snapshots, estimates, invested-only values, and stale active values', () => {
    const result = getInvestmentValueSourceSummary([
      investment({ id: 'snapshot', valuationSnapshots: [{ id: 1, investmentId: 'snapshot', snapshotDate: daysFromNow(-1), marketValue: 1400 }] }),
      investment({ id: 'estimated', currentValue: 1100, lastValuationAt: daysFromNow(-10) }),
      investment({ id: 'invested', currentValue: 1400, lastValuationAt: daysFromNow(1) }),
      investment({ id: 'stale', currentValue: 900, lastValuationAt: daysFromNow(-91) }),
      investment({ id: 'no-value', accountingTreatment: 'INSURANCE_SAVINGS', totalInvested: 0, currentValue: 0, lastValuationAt: undefined }),
    ]);

    expect(result.snapshotBackedIds).toEqual(['snapshot']);
    expect(result.estimatedIds).toEqual(['estimated', 'stale']);
    expect(result.investedOnlyIds).toContain('invested');
    expect(result.staleValuationIds).toContain('stale');
    expect(result.insuranceSavingsWithoutValueIds).toEqual(['no-value']);
    expect(result.insuranceSavingsWithoutValueCount).toBe(1);
  });

  it('filters search, status, category, treatment, and ignores protection in allocation', () => {
    const values = [
      investment({ id: 'one', name: 'Alpha Fund', category: 'EQUITY' }),
      investment({ id: 'two', name: 'Beta Policy', category: 'LIFE', accountingTreatment: 'INSURANCE_SAVINGS' }),
      investment({ id: 'three', name: 'Alpha Cover', category: 'LIFE', accountingTreatment: 'PROTECTION_EXPENSE' }),
    ];

    expect(getFilteredInvestments(values, { search: ' alpha ', statusFilter: 'all', categoryFilter: 'all' })).toHaveLength(2);
    expect(getFilteredInvestments(values, { search: '', statusFilter: 'active', categoryFilter: 'EQUITY', treatmentFilter: 'INVESTMENT' })).toEqual([values[0]]);
    expect(getInvestmentContributionAllocation(values, [])).toEqual([
      { key: 'EQUITY', label: 'EQUITY', value: 1000, investmentIds: ['one'] },
      { key: 'LIFE', label: 'LIFE', value: 1000, investmentIds: ['two'] },
    ]);
  });

  it('includes only active recurring plans and applies due-tone boundaries', () => {
    const items = getInvestmentContributionViewItems([
      investment({ id: 'overdue', activeContributionPlan: { id: 1, status: 'active', cadenceUnit: 'month', cadenceInterval: 1, amount: 10, nextDueDate: daysFromNow(-1) } }),
      investment({ id: 'soon', activeContributionPlan: { id: 2, status: 'active', cadenceUnit: 'month', cadenceInterval: 1, amount: 10, nextDueDate: daysFromNow(7) } }),
      investment({ id: 'paused', activeContributionPlan: { id: 3, status: 'paused', cadenceUnit: 'month', cadenceInterval: 1, amount: 10, nextDueDate: daysFromNow(1) } }),
    ]);

    expect(items.map((item) => item.id)).toEqual(['overdue', 'soon']);
    expect(items[0].dueTone).toBe('error');
    expect(items[1].dueTone).toBe('warning');
  });

  it('deduplicates maturity benefits and honors exclusive 30/90/180-day buckets', () => {
    const values = [investment({
      id: 'policy',
      accountingTreatment: 'INSURANCE_SAVINGS',
      maturityDate: daysFromNow(31),
      benefits: [
        { id: 1, investmentId: 'policy', benefitType: 'MATURITY', amount: 2000, benefitDate: daysFromNow(31), status: 'EXPECTED' },
        { id: 2, investmentId: 'policy', benefitType: 'BONUS', amount: 50, benefitDate: daysFromNow(30), status: 'EXPECTED' },
        { id: 3, investmentId: 'policy', benefitType: 'INTEREST', amount: 5, benefitDate: daysFromNow(91), status: 'CANCELLED' },
      ],
    })];

    expect(getUpcomingMaturitiesAndBenefits(values, '30d').map((item) => item.benefitType)).toEqual(['BONUS']);
    expect(getUpcomingMaturitiesAndBenefits(values, '90d').map((item) => item.benefitType)).toEqual(['MATURITY']);
    expect(getUpcomingMaturitiesAndBenefits(values, '180d')).toEqual([]);
  });

  it('creates fiscal-year monthly series and maturity buckets', () => {
    const values = [investment({ maturityDate: daysFromNow(10), startDate: '2026-04-01' })];
    const fiscalYear = `FY ${dayjs('2026-04-01').year()}-${String(dayjs('2026-04-01').year() + 1).slice(-2)}`;
    const monthly = getInvestmentMonthlyTimeSeriesData(values, fiscalYear);
    const ladder = getInvestmentMaturityLadderData(values, 1);

    expect(monthly[0].label).toMatch(/Apr 2026/);
    expect(monthly[0].invested).toBe(1000);
    expect(ladder[0].count).toBe(1);
    expect(ladder[0].investmentIds).toEqual(['fund-1']);
  });

  it('calculates insurance premiums by cadence and excludes cancelled benefits', () => {
    const result = getInsurancePositionData([
      investment({
        id: 'savings',
        assetType: 'INSURANCE',
        accountingTreatment: 'INSURANCE_SAVINGS',
        totalInvested: 1200,
        insuranceCover: 5000,
        activeContributionPlan: { id: 1, status: 'active', cadenceUnit: 'month', cadenceInterval: 1, amount: 100 },
        benefits: [
          { id: 1, investmentId: 'savings', benefitType: 'BONUS', amount: 100, benefitDate: daysFromNow(10), status: 'EXPECTED' },
          { id: 2, investmentId: 'savings', benefitType: 'BONUS', amount: 999, benefitDate: daysFromNow(20), status: 'CANCELLED' },
        ],
      }),
      investment({ id: 'cover', assetType: 'INSURANCE', accountingTreatment: 'PROTECTION_EXPENSE', totalInvested: 80, insuranceCover: 10000 }),
    ], []);

    expect(result.summary).toMatchObject({
      totalCover: 15000,
      savingsPremiumPaid: 1200,
      protectionPremiumPaid: 80,
      annualSavingsPremium: 1200,
      expectedBenefitsTotal: 100,
      activePoliciesCount: 2,
    });
  });
});