import { PAGE_MONTH_OPTIONS, FISCAL_YEAR_START_MONTH, type GlobalDateFilterState } from '../../store/pageDateFilterStore';
import { getInvestmentCategoryOptions, normalizeInvestmentForUi } from '../../utils/investmentHelpers';
import { getStableSeriesColorMap } from '../../colors';
import type { CategoryRecord } from '../categories/categories.types';
import type { GoalRecord } from '../goals/goal.types';
import type { TransactionRecord } from '../transactions/transaction.types';
import type {
  DashboardAccountOverviewRow,
  DashboardCategoryPieItem,
  DashboardInvestmentActionItem,
  DashboardInvestmentSummary,
  DashboardMonthlySummary,
  DashboardPageData,
  DashboardInvestmentRecord,
} from './dashboard.types';
const getTransactionDate = (transaction: TransactionRecord) =>
  new Date(transaction.date || transaction.createdAt || Date.now());

const summarizeSources = (
  items: TransactionRecord[],
  accountNameById: Record<number, string>,
) => {
  return items.reduce<Record<string, { name: string; income: number; expense: number; balance: number; transactions: number }>>(
    (acc, item) => {
      const sourceId = Number(item.sourceAccountId);
      const sourceName =
        accountNameById[sourceId] ||
        String(item.source || 'Unknown source').trim() ||
        'Unknown source';

      if (!acc[sourceName]) {
        acc[sourceName] = {
          name: sourceName,
          income: 0,
          expense: 0,
          balance: 0,
          transactions: 0,
        };
      }

      const amount = Number(item.amount) || 0;
      if (item.type === 'income') {
        acc[sourceName].income += amount;
      } else {
        acc[sourceName].expense += amount;
      }

      acc[sourceName].balance = acc[sourceName].income - acc[sourceName].expense;
      acc[sourceName].transactions += 1;
      return acc;
    },
    {},
  );
};

export const getDashboardPeriodLabel = (filterState: GlobalDateFilterState) => {
  if (filterState.scopeMode === 'tillNow') return 'Till Now';

  if (filterState.scopeMode === 'range') {
    if (!filterState.rangeStart || !filterState.rangeEnd) return 'Custom Range';
    const start = new Date(filterState.rangeStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const end = new Date(filterState.rangeEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} – ${end}`;
  }

  const { selectedYear, selectedMonth } = filterState;
  if (filterState.mode === 'monthly') {
    const fiscalYear = selectedMonth >= FISCAL_YEAR_START_MONTH ? selectedYear : selectedYear + 1;
    return `${PAGE_MONTH_OPTIONS[selectedMonth]} ${fiscalYear}`;
  }

  return `FY ${selectedYear}-${String(selectedYear + 1).slice(-2)}`;
};

export const getDashboardFilteredTransactions = (
  transactions: TransactionRecord[],
  filterState: GlobalDateFilterState,
  matchesGlobalDateFilter: (date: Date, state: GlobalDateFilterState) => boolean,
) => {
  return transactions.filter((transaction) => {
    const date = getTransactionDate(transaction);
    return matchesGlobalDateFilter(date, filterState);
  });
};

export const getDashboardAccountOverviewRows = (
  accounts: DashboardPageData['accounts'],
  periodBankSummaries: ReturnType<typeof summarizeSources>,
) => {
  const openingBalanceByName = accounts.reduce<Record<string, number>>((acc, account) => {
    const name = account.displayName || account.institutionName || account.name;
    if (name) acc[name] = Number(account.openingBalance) || 0;
    return acc;
  }, {});

  const allSources = new Set([
    ...accounts.map((account) => account.displayName || account.institutionName || account.name),
    ...Object.keys(periodBankSummaries),
  ]);

  const sourceNames = Array.from(allSources).filter((name): name is string => Boolean(name));

  return sourceNames
    .map<DashboardAccountOverviewRow>((name) => ({
      name,
      // account balance = opening balance + net of transactions within the selected period
      balance: (openingBalanceByName[name] || 0) + (periodBankSummaries[name]?.balance || 0),
      transactions: periodBankSummaries[name]?.transactions || 0,
    }))
    .sort((left, right) => {
      if (right.balance !== left.balance) return right.balance - left.balance;
      return right.transactions - left.transactions;
    });
};

export const getDashboardCategoryPieData = (filteredTransactions: TransactionRecord[]) => {
  const filtered = filteredTransactions.filter((transaction) => transaction.type === 'expense');
  const byCategory = filtered.reduce<Record<string, number>>((acc, transaction) => {
    const key = transaction.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + (Number(transaction.amount) || 0);
    return acc;
  }, {});

  const categoryEntries = Object.entries(byCategory);
  const colorByCategory = getStableSeriesColorMap(
    categoryEntries.map(([name]) => name),
    'dashboard-category-pie',
  );

  const items = categoryEntries
    .map(([name, value]) => ({
      name,
      value,
      color: colorByCategory.get(name) ?? '#94a3b8',
    }))
    .sort((left, right) => right.value - left.value);

  const total = items.reduce((sum, item) => sum + item.value, 0);
  return {
    total,
    items: items.map((item) => ({
      ...item,
      percentage: total > 0 ? item.value / total : 0,
    })) as DashboardCategoryPieItem[],
  };
};

export const getDashboardRecentTransactions = (filteredTransactions: TransactionRecord[]) => {
  return [...filteredTransactions]
    .sort((left, right) => getTransactionDate(right).valueOf() - getTransactionDate(left).valueOf())
    .slice(0, 5);
};

export const getDashboardCategoryLookup = (categories: CategoryRecord[]) => {
  const lookup = new Map<string, CategoryRecord>();

  categories.forEach((category) => {
    const keys = [category._id, category.id, category.name]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());

    keys.forEach((key) => lookup.set(key, category));
  });

  return lookup;
};

export const getDashboardSortedGoals = (goals: GoalRecord[]) => {
  return [...goals].sort((left, right) => {
    const leftProgress =
      Number(left.targetAmount || 0) > 0
        ? Number(left.currentAmount || 0) / Number(left.targetAmount || 0)
        : 0;
    const rightProgress =
      Number(right.targetAmount || 0) > 0
        ? Number(right.currentAmount || 0) / Number(right.targetAmount || 0)
        : 0;

    return rightProgress - leftProgress;
  });
};

export const getDashboardVisibleGoals = (sortedGoals: GoalRecord[]) => sortedGoals.slice(0, 3);

export const getDashboardActiveGoalsCount = (goals: GoalRecord[]) => {
  return goals.filter((goal) => {
    const target = Number(goal.targetAmount || 0);
    const current = Number(goal.currentAmount || 0);
    return !target || current < target;
  }).length;
};

export const getDashboardMonthlySummary = (
  filteredTransactions: TransactionRecord[],
  totals: { income: number; expense: number; balance: number },
) => {
  const incomeTransactions = filteredTransactions
    .filter((transaction) => transaction.type === 'income')
    .sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0));
  const expenseTransactions = filteredTransactions
    .filter((transaction) => transaction.type === 'expense')
    .sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0));
  const expenseDays = new Set(expenseTransactions.map((transaction) => getTransactionDate(transaction).toISOString().slice(0, 10)));
  const averageExpense = expenseDays.size > 0 ? totals.expense / expenseDays.size : 0;
  const savingsRate = totals.income > 0 ? (totals.balance / totals.income) * 100 : 0;

  return {
    highestIncome: incomeTransactions[0] || null,
    highestExpense: expenseTransactions[0] || null,
    totalTransactions: filteredTransactions.length,
    averageExpense,
    savingsRate,
  } satisfies DashboardMonthlySummary;
};

export const getDashboardInvestmentPeriodBounds = (filterState: GlobalDateFilterState) => {
  // Far-future/epoch bounds effectively mean "no restriction" for tillNow/open range ends.
  if (filterState.scopeMode === 'tillNow') {
    return { start: new Date(0), end: new Date(8640000000000000) };
  }

  if (filterState.scopeMode === 'range') {
    const start = filterState.rangeStart ? new Date(filterState.rangeStart) : new Date(0);
    const end = filterState.rangeEnd
      ? new Date(new Date(filterState.rangeEnd).setHours(23, 59, 59, 999))
      : new Date(8640000000000000);
    return { start, end };
  }

  const { selectedYear, selectedMonth } = filterState;
  if (filterState.mode === 'monthly') {
    return {
      start: new Date(selectedYear, selectedMonth, 1),
      end: new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999),
    };
  }

  return {
    start: new Date(selectedYear, FISCAL_YEAR_START_MONTH, 1),
    end: new Date(selectedYear + 1, FISCAL_YEAR_START_MONTH, 0, 23, 59, 59, 999),
  };
};

export const getDashboardInvestmentSummary = (
  investments: DashboardInvestmentRecord[],
  investmentPeriodBounds: { start: Date; end: Date },
  categoryLabelMap: Record<string, string>,
): DashboardInvestmentSummary => {
  const { start: periodStart, end: periodEnd } = investmentPeriodBounds;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // "Overdue"/"stale" are judged as of the selected period's end, capped at today so a
  // future-dated period end (e.g. the current fiscal month) doesn't hide real overdue items.
  const referenceDate = periodEnd < today ? periodEnd : today;

  const allActiveInvestments = investments.filter((investment) => investment.status === 'active');
  const periodInvestments = allActiveInvestments.filter((investment) => {
    const startDate = investment.startDate ? new Date(investment.startDate) : null;
    return !startDate || startDate <= periodEnd;
  });

  const periodTotalInvested = periodInvestments.reduce(
    (sum, investment) => sum + (Number(investment.totalInvested) || 0),
    0,
  );
  const periodCurrentValue = periodInvestments.reduce(
    (sum, investment) => sum + (Number(investment.currentValue || investment.totalInvested) || 0),
    0,
  );
  const periodUnrealisedGain = periodCurrentValue - periodTotalInvested;
  const periodUnrealisedGainPct = periodTotalInvested > 0 ? (periodUnrealisedGain / periodTotalInvested) * 100 : 0;

  const categoryTotals = periodInvestments.reduce<Record<string, number>>((acc, investment) => {
    const key = investment.assetCategory || investment.category || 'other';
    acc[key] = (acc[key] || 0) + (Number(investment.totalInvested) || 0);
    return acc;
  }, {});
  const allocationBreakdown = Object.entries(categoryTotals)
    .map(([key, value]) => ({
      key,
      label: categoryLabelMap[key] || key,
      value,
      pct: periodTotalInvested > 0 ? (value / periodTotalInvested) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value);

  const periodActionInvestments = allActiveInvestments.filter((investment) => {
    const startDate = investment.startDate ? new Date(investment.startDate) : null;
    return !startDate || startDate <= periodEnd;
  });

  const upcomingContributions = periodActionInvestments
    .filter((investment) => {
      const dueDate = investment.activeContributionPlan?.nextDueDate;
      const planStatus = String(investment.activeContributionPlan?.status || '').toLowerCase();
      if (!dueDate || planStatus !== 'active') return false;
      const due = new Date(dueDate);
      return due >= periodStart && due <= periodEnd;
    })
    .sort(
      (left, right) =>
        new Date(left.activeContributionPlan!.nextDueDate!).valueOf() -
        new Date(right.activeContributionPlan!.nextDueDate!).valueOf(),
    );

  const overdueContributions = periodActionInvestments
    .filter((investment) => {
      if (!investment.activeContributionPlan?.nextDueDate) return false;
      if (
        !investment.activeContributionPlan?.nextDueDate ||
        String(investment.activeContributionPlan?.status || '').toLowerCase() !== 'active'
      ) {
        return false;
      }
      const due = new Date(investment.activeContributionPlan.nextDueDate);
      due.setHours(0, 0, 0, 0);
      return due < referenceDate;
    })
    .sort(
      (left, right) =>
        new Date(left.activeContributionPlan!.nextDueDate!).valueOf() -
        new Date(right.activeContributionPlan!.nextDueDate!).valueOf(),
    );

  const upcomingMaturities = periodActionInvestments
    .filter((investment) => {
      if (!investment.maturityDate) return false;
      const due = new Date(investment.maturityDate);
      return due >= periodStart && due <= periodEnd;
    })
    .sort((left, right) => new Date(left.maturityDate!).valueOf() - new Date(right.maturityDate!).valueOf());

  const ninetyDaysAgo = new Date(referenceDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const staleValuationCount = periodActionInvestments.filter((investment) => {
    const startDate = investment.startDate ? new Date(investment.startDate) : null;
    const isEstablished = !startDate || startDate < ninetyDaysAgo;
    if (!isEstablished) return false;
    if (!investment.lastValuationAt) return true;
    return new Date(investment.lastValuationAt) < ninetyDaysAgo;
  }).length;

  const actionItemsAll: DashboardInvestmentActionItem[] = [
    ...overdueContributions.map((investment) => ({
      id: investment.id,
      name: investment.name,
      kind: 'overdue' as const,
      date: investment.activeContributionPlan!.nextDueDate!,
      amount: Number(investment.activeContributionPlan!.amount) || 0,
    })),
    ...upcomingContributions
      .filter((investment) => !overdueContributions.find((overdue) => overdue.id === investment.id))
      .map((investment) => ({
        id: investment.id,
        name: investment.name,
        kind: 'due' as const,
        date: investment.activeContributionPlan!.nextDueDate!,
        amount: Number(investment.activeContributionPlan!.amount) || 0,
      })),
    ...upcomingMaturities.map((investment) => ({
      id: investment.id,
      name: investment.name,
      kind: 'maturing' as const,
      date: investment.maturityDate!,
      amount: Number(investment.currentValue || investment.totalInvested) || 0,
    })),
  ].sort((left, right) => {
    if (left.kind === 'overdue' && right.kind !== 'overdue') return -1;
    if (right.kind === 'overdue' && left.kind !== 'overdue') return 1;
    return new Date(left.date).valueOf() - new Date(right.date).valueOf();
  });

  return {
    activeCount: allActiveInvestments.length,
    periodTotalInvested,
    periodCurrentValue,
    periodUnrealisedGain,
    periodUnrealisedGainPct,
    insuranceCover: allActiveInvestments.reduce(
      (sum, investment) => sum + (Number(investment.insuranceCover) || 0),
      0,
    ),
    allocationBreakdown,
    upcomingContributionAmount: upcomingContributions.reduce(
      (sum, investment) => sum + (Number(investment.activeContributionPlan!.amount) || 0),
      0,
    ),
    upcomingMaturityAmount: upcomingMaturities.reduce(
      (sum, investment) => sum + (Number(investment.currentValue || investment.totalInvested) || 0),
      0,
    ),
    actionItems: actionItemsAll.slice(0, 4),
    actionItemsTotalCount: actionItemsAll.length,
    staleValuationCount,
  };
};

export const getDashboardViewData = ({
  transactions,
  goals,
  categories,
  accounts,
  investments,
  taxonomyNodes,
}: DashboardPageData) => {
  const accountNameById = accounts.reduce<Record<number, string>>((acc, account) => {
    acc[Number(account.id)] = account.displayName || account.institutionName || account.name || '';
    return acc;
  }, {});

  const categoryLabelMap: Record<string, string> = {};
  getInvestmentCategoryOptions(taxonomyNodes as never[])
    .filter((option) => option.value !== 'all')
    .forEach((option) => {
      categoryLabelMap[option.value] = option.label;
    });

  return {
    accountNameById,
    categoryLabelMap,
    transactions,
    goals,
    categories,
    accounts,
    investments: investments.map((investment) => normalizeInvestmentForUi(investment as never, taxonomyNodes as never[])),
    taxonomyNodes,
  };
};
