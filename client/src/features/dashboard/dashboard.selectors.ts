import { PAGE_MONTH_OPTIONS, FISCAL_YEAR_START_MONTH, type PageDateFilterMode } from '../../store/pageDateFilterStore';
import { getInvestmentCategoryOptions, normalizeInvestmentForUi } from '../../utils/investmentHelpers';
import type { CategoryRecord } from '../categories/categories.types';
import type { GoalRecord } from '../goals/goal.types';
import type { TransactionRecord } from '../transactions/transaction.types';
import type {
  DashboardAccountOverviewRow,
  DashboardCategoryPieItem,
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

export const getDashboardPeriodLabel = (periodMode: PageDateFilterMode, selectedYear: number, selectedMonth: number) => {
  if (periodMode === 'monthly') {
    const fiscalYear = selectedMonth >= FISCAL_YEAR_START_MONTH ? selectedYear : selectedYear + 1;
    return `${PAGE_MONTH_OPTIONS[selectedMonth]} ${fiscalYear}`;
  }

  return `FY ${selectedYear}-${String(selectedYear + 1).slice(-2)}`;
};

export const getDashboardFilteredTransactions = (
  transactions: TransactionRecord[],
  periodMode: PageDateFilterMode,
  selectedYear: number,
  selectedMonth: number,
  matchesPageDateFilter: (date: Date, mode: PageDateFilterMode, year: number, month: number) => boolean,
) => {
  return transactions.filter((transaction) => {
    const date = getTransactionDate(transaction);
    return matchesPageDateFilter(date, periodMode, selectedYear, selectedMonth);
  });
};

export const getDashboardAccountOverviewRows = (
  accounts: DashboardPageData['accounts'],
  lifetimeBankSummaries: ReturnType<typeof summarizeSources>,
  periodBankSummaries: ReturnType<typeof summarizeSources>,
) => {
  const allSources = new Set([
    ...accounts.map((account) => account.displayName || account.institutionName || account.name),
    ...Object.keys(lifetimeBankSummaries),
    ...Object.keys(periodBankSummaries),
  ]);

  const sourceNames = Array.from(allSources).filter((name): name is string => Boolean(name));

  return sourceNames
    .map<DashboardAccountOverviewRow>((name) => ({
      name,
      currentBalance: lifetimeBankSummaries[name]?.balance || 0,
      periodChange: periodBankSummaries[name]?.balance || 0,
      transactions: lifetimeBankSummaries[name]?.transactions || 0,
      periodTransactions: periodBankSummaries[name]?.transactions || 0,
    }))
    .sort((left, right) => {
      if (right.currentBalance !== left.currentBalance) return right.currentBalance - left.currentBalance;
      if (right.periodChange !== left.periodChange) return right.periodChange - left.periodChange;
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

  const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const items = Object.entries(byCategory)
    .map(([name, value], index) => ({
      name,
      value,
      color: palette[index % palette.length],
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

export const getDashboardInvestmentPeriodBounds = (
  periodMode: PageDateFilterMode,
  selectedYear: number,
  selectedMonth: number,
) => {
  if (periodMode === 'monthly') {
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

  const allActiveInvestments = investments.filter((investment) => investment.status === 'active');
  const periodInvestments = allActiveInvestments.filter((investment) => {
    const startDate = investment.startDate ? new Date(investment.startDate) : null;
    return startDate && startDate >= periodStart && startDate <= periodEnd;
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

  const totalInvested = allActiveInvestments.reduce(
    (sum, investment) => sum + (Number(investment.totalInvested) || 0),
    0,
  );
  const currentValue = allActiveInvestments.reduce(
    (sum, investment) => sum + (Number(investment.currentValue || investment.totalInvested) || 0),
    0,
  );
  const unrealisedGain = currentValue - totalInvested;
  const unrealisedGainPct = totalInvested > 0 ? (unrealisedGain / totalInvested) * 100 : 0;

  const categoryTotals = allActiveInvestments.reduce<Record<string, number>>((acc, investment) => {
    const key = investment.assetCategory || investment.category || 'other';
    acc[key] = (acc[key] || 0) + (Number(investment.totalInvested) || 0);
    return acc;
  }, {});
  const allocationBreakdown = Object.entries(categoryTotals)
    .map(([key, value]) => ({
      key,
      label: categoryLabelMap[key] || key,
      value,
      pct: totalInvested > 0 ? (value / totalInvested) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value);

  const periodActionInvestments = allActiveInvestments.filter((investment) => {
    const startDate = investment.startDate ? new Date(investment.startDate) : null;
    return !startDate || startDate <= periodEnd;
  });

  const upcomingContributions = periodActionInvestments
    .filter((investment) => {
      const dueDate = investment.activeContributionPlan?.nextDueDate;
      if (!dueDate) return false;
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
      const due = new Date(investment.activeContributionPlan.nextDueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
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

  const allContribDue = [
    ...overdueContributions,
    ...upcomingContributions.filter(
      (investment) => !overdueContributions.find((overdue) => overdue.id === investment.id),
    ),
  ].slice(0, 3);

  return {
    activeCount: allActiveInvestments.length,
    totalInvested,
    currentValue,
    unrealisedGain,
    unrealisedGainPct,
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
    upcomingMaturities: upcomingMaturities.slice(0, 3),
    upcomingMaturityAmount: upcomingMaturities.reduce(
      (sum, investment) => sum + (Number(investment.currentValue || investment.totalInvested) || 0),
      0,
    ),
    allContribDue,
    overdueCount: overdueContributions.length,
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
