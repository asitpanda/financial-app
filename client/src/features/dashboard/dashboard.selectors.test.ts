import { describe, expect, it, vi } from 'vitest';
import {
  DASHBOARD_ALL_TIME_BOUNDS,
  getDashboardAccountOverviewRows,
  getDashboardCategoryPieData,
  getDashboardCategoryLookup,
  getDashboardActiveGoalsCount,
  getDashboardInvestmentSummary,
  getDashboardMonthlySummary,
  getDashboardRecentTransactions,
  getDashboardSortedGoals,
  getDashboardVisibleGoals,
  getDashboardViewData,
} from './dashboard.selectors';

describe('dashboard selectors', () => {
  it('sorts account rows by balance and then transaction count', () => {
    expect(getDashboardAccountOverviewRows([
      { id: 1, displayName: 'Savings', currentBalance: 100 },
      { id: 2, name: 'Wallet', currentBalance: 100 },
      { id: 3, name: 'Credit', currentBalance: -50 },
    ], { 1: 1, 2: 3 })).toEqual([
      { name: 'Wallet', balance: 100, transactions: 3 },
      { name: 'Savings', balance: 100, transactions: 1 },
      { name: 'Credit', balance: -50, transactions: 0 },
    ]);
  });

  it('builds expense category totals and percentages while ignoring income', () => {
    const result = getDashboardCategoryPieData([
      { id: 1, type: 'EXPENSE', amount: 25, category: 'Food' },
      { id: 2, type: 'EXPENSE', amount: 75, category: 'Food' },
      { id: 3, type: 'EXPENSE', amount: 50, category: '' },
      { id: 4, type: 'INCOME', amount: 100, category: 'Salary' },
    ] as never);

    expect(result.total).toBe(150);
    expect(result.items.map(({ name, value, percentage }) => ({ name, value, percentage }))).toEqual([
      { name: 'Food', value: 100, percentage: 2 / 3 },
      { name: 'Uncategorized', value: 50, percentage: 1 / 3 },
    ]);
  });

  it('sorts recent transactions and limits them to five', () => {
    const transactions = Array.from({ length: 6 }, (_, index) => ({
      id: index,
      type: 'EXPENSE',
      amount: index,
      date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    }));

    expect(getDashboardRecentTransactions(transactions as never).map((item) => item.id)).toEqual([5, 4, 3, 2, 1]);
  });

  it('indexes categories by IDs, names, and case-insensitive aliases', () => {
    const category = { id: 'cat-1', _id: 'mongo-cat-1', name: 'Groceries' };
    const lookup = getDashboardCategoryLookup([category] as never);

    expect(lookup.get('cat-1')).toBe(category);
    expect(lookup.get('mongo-cat-1')).toBe(category);
    expect(lookup.get('groceries')).toBe(category);
  });

  it('sorts goals by progress and exposes only the first three', () => {
    const goals = [
      { id: 'low', targetAmount: 100, currentAmount: 10 },
      { id: 'complete', targetAmount: 100, currentAmount: 100 },
      { id: 'mid', targetAmount: 100, currentAmount: 50 },
      { id: 'zero', targetAmount: 0, currentAmount: 20 },
    ];

    const sorted = getDashboardSortedGoals(goals as never);
    expect(sorted.map((goal) => goal.id)).toEqual(['complete', 'mid', 'low', 'zero']);
    expect(getDashboardVisibleGoals(sorted as never).map((goal) => goal.id)).toEqual(['complete', 'mid', 'low']);
    expect(getDashboardActiveGoalsCount(goals as never)).toBe(3);
  });

  it('builds view data with account aliases and safe optional collections', () => {
    const result = getDashboardViewData({
      transactions: [], goals: [], categories: [],
      accounts: [{ id: 7, displayName: 'Savings' }],
      investments: [], taxonomyNodes: [],
    } as never);

    expect(result.accountNameById).toEqual({ 7: 'Savings' });
    expect(result.categoryLabelMap).toEqual({});
    expect(result.investments).toEqual([]);
  });

  it('calculates monthly highlights without income or expense division errors', () => {
    const transactions = [
      { type: 'INCOME', amount: 200, category: 'Salary', date: '2026-01-01' },
      { type: 'EXPENSE', amount: 50, category: 'Food', date: '2026-01-01' },
      { type: 'EXPENSE', amount: 25, category: 'Travel', date: '2026-01-02' },
    ];

    expect(getDashboardMonthlySummary(transactions as never, {
      income: 200,
      expense: 75,
      balance: 125,
    })).toMatchObject({
      highestIncome: transactions[0],
      highestExpense: transactions[1],
      totalTransactions: 3,
      averageExpense: 37.5,
      savingsRate: 62.5,
    });
    expect(getDashboardMonthlySummary([], { income: 0, expense: 0, balance: 0 })).toMatchObject({
      highestIncome: null,
      highestExpense: null,
      averageExpense: 0,
      savingsRate: 0,
    });
  });

  it('summarizes active investments, excludes non-portfolio treatments, and respects active plans', () => {
    vi.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    const result = getDashboardInvestmentSummary([
      {
        id: 'one', name: 'Fund', status: 'active', totalInvested: 1000, currentValue: 1200,
        assetCategory: 'equity', activeContributionPlan: { id: 'plan-1', cadenceUnit: 'month', cadenceInterval: 1, amount: 100, nextDueDate: '2026-01-20', isActive: true },
      },
      {
        id: 'paused', name: 'Paused', status: 'active', totalInvested: 500, currentValue: 500,
        assetCategory: 'debt', activeContributionPlan: { id: 'plan-2', cadenceUnit: 'month', cadenceInterval: 1, amount: 50, nextDueDate: '2026-01-10', isActive: false },
      },
      { id: 'insurance', name: 'Insurance', status: 'active', totalInvested: 300, currentValue: 300, accountingTreatment: 'INSURANCE_SAVINGS', insuranceCover: 5000 },
    ] as never, DASHBOARD_ALL_TIME_BOUNDS, { equity: 'Equity' });

    expect(result).toMatchObject({
      activeCount: 3,
      periodTotalInvested: 1500,
      periodCurrentValue: 1700,
      periodUnrealisedGain: 200,
      insuranceCover: 5000,
      insuranceSavingsContribution: 300,
      upcomingContributionAmount: 100,
    });
    expect(result.actionItems).toEqual([
      expect.objectContaining({ id: 'one', kind: 'due', amount: 100 }),
    ]);
    vi.useRealTimers();
  });

  it('handles overdue contributions, maturities, stale valuations, and capped action items', () => {
    vi.setSystemTime(new Date('2026-06-30T00:00:00Z'));
    const investments: Array<Record<string, unknown>> = Array.from({ length: 6 }, (_, index) => ({
      id: `investment-${index}`,
      name: `Investment ${index}`,
      status: 'active',
      totalInvested: 100,
      currentValue: 90,
      startDate: '2025-01-01',
      lastValuationAt: '2025-01-01',
      activeContributionPlan: {
        id: `plan-${index}`,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        amount: 25,
        nextDueDate: '2026-06-01',
        isActive: true,
      },
    }));
    investments[5].maturityDate = '2026-06-15';

    const result = getDashboardInvestmentSummary(
      investments as never,
      { start: new Date('2026-01-01'), end: new Date('2026-12-31') },
      {},
    );

    expect(result.actionItemsTotalCount).toBe(7);
    expect(result.actionItems).toHaveLength(4);
    expect(result.actionItems[0]).toMatchObject({ kind: 'overdue', amount: 25 });
    expect(result.upcomingMaturityAmount).toBe(90);
    expect(result.staleValuationCount).toBe(6);
    vi.useRealTimers();
  });
});