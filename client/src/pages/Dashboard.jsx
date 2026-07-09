import React, { useEffect, useMemo, useState } from "react";
import Icon from "@mdi/react";
import { KpiCard } from "../components/common";
import AddTransactionModal from "../components/AddTransactionModal";
import GoalFormDrawer from "../components/GoalFormDrawer";
import CategoryFormDrawer from "../components/CategoryFormDrawer";
import { getIconPathByKey } from "../constants/categoryIcons";
import { navigateTo } from "../services/navigation";

import { getTransactions, createTransaction } from "../api/transactions";
import { getGoals, createGoal, updateGoal } from "../api/goals";
import { getCategories, createCategory } from "../api/categories";
import { getInvestments } from "../api/investments";
import {
  PAGE_MONTH_OPTIONS,
  FISCAL_YEAR_START_MONTH,
  usePageDateFilterStore,
  matchesPageDateFilter,
} from "../store/pageDateFilterStore";

const resolveFiscalMonthYear = (fiscalYearStart, monthIndex) => {
  const year = monthIndex >= FISCAL_YEAR_START_MONTH ? fiscalYearStart : fiscalYearStart + 1;
  return { year, month: monthIndex };
};

const getGoalId = (goal) => goal?._id || goal?.id;
const getTransactionId = (transaction) => transaction?._id || transaction?.id;
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const summarizeTransactions = (items) => {
  const income = items
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const expense = items
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return { income, expense, balance: income - expense };
};
const summarizeSources = (items) => {
  return items.reduce((acc, item) => {
    const sourceName = String(item.source || "Unknown source").trim() || "Unknown source";

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
    if (item.type === "income") {
      acc[sourceName].income += amount;
    } else {
      acc[sourceName].expense += amount;
    }

    acc[sourceName].balance = acc[sourceName].income - acc[sourceName].expense;
    acc[sourceName].transactions += 1;
    return acc;
  }, {});
};

const formatShortDate = (value) => new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date(value));
const isWithinDays = (value, days) => {
  if (!value) return false;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);

  const diffDays = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
};
const DEFAULT_TX_ICON_BY_TYPE = {
  income: "briefcase",
  expense: "cart",
};
const GOAL_STYLE_TOKENS = [
  { iconBg: "bg-emerald-100", iconText: "text-emerald-600", bar: "from-emerald-500 to-emerald-400" },
  { iconBg: "bg-violet-100", iconText: "text-violet-600", bar: "from-violet-500 to-violet-400" },
  { iconBg: "bg-amber-100", iconText: "text-amber-600", bar: "from-amber-500 to-amber-400" },
  { iconBg: "bg-rose-100", iconText: "text-rose-600", bar: "from-rose-500 to-rose-400" },
  { iconBg: "bg-sky-100", iconText: "text-sky-600", bar: "from-sky-500 to-sky-400" },
];
const INVESTMENT_TYPE_CHART_COLORS = ["#059669", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];
const DEFAULT_GOAL_ICON = "gift";
const formatDeadline = (value) => {
  if (!value) return "No target date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No target date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

function DashboardCard({ title, action, children, className = "", contentClassName = "" }) {
  return (
    <section
      className={[
        "rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]",
        className,
      ].filter(Boolean).join(" ")}
    >
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export default function Dashboard({ onOpenTransactionsFromDashboard }) {
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [investments, setInvestments] = useState([]);
  const periodMode = usePageDateFilterStore((state) => state.mode);
  const selectedYear = usePageDateFilterStore((state) => state.selectedYear);
  const selectedMonth = usePageDateFilterStore((state) => state.selectedMonth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showGoalDrawer, setShowGoalDrawer] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const getTxDate = (tx) => new Date(tx.date || tx.createdAt || Date.now());

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = getTxDate(tx);
      return matchesPageDateFilter(d, periodMode, selectedYear, selectedMonth);
    });
  }, [transactions, periodMode, selectedYear, selectedMonth]);

  const totals = useMemo(() => {
    return summarizeTransactions(filteredTransactions);
  }, [filteredTransactions]);

  const lifetimeTotals = useMemo(() => {
    return summarizeTransactions(transactions);
  }, [transactions]);

  const periodBankSummaries = useMemo(() => {
    return summarizeSources(filteredTransactions);
  }, [filteredTransactions]);

  const lifetimeBankSummaries = useMemo(() => {
    return summarizeSources(transactions);
  }, [transactions]);

  const accountOverviewRows = useMemo(() => {
    const allSources = new Set([
      ...Object.keys(lifetimeBankSummaries),
      ...Object.keys(periodBankSummaries),
    ]);

    return Array.from(allSources)
      .map((name) => ({
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
  }, [lifetimeBankSummaries, periodBankSummaries]);

  const categoryPieData = useMemo(() => {
    const filtered = filteredTransactions.filter((tx) => tx.type === "expense");

    const byCategory = filtered.reduce((acc, tx) => {
      const key = tx.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + (Number(tx.amount) || 0);
      return acc;
    }, {});

    const palette = [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#84cc16",
    ];

    const items = Object.entries(byCategory)
      .map(([name, value], index) => ({
        name,
        value,
        color: palette[index % palette.length],
      }))
      .sort((a, b) => b.value - a.value);

    const total = items.reduce((sum, item) => sum + item.value, 0);
    return { items, total };
  }, [filteredTransactions]);

  const selectedPeriodLabel =
    periodMode === "monthly"
      ? (() => {
        const resolved = resolveFiscalMonthYear(selectedYear, selectedMonth);
        return `${PAGE_MONTH_OPTIONS[selectedMonth]} ${resolved.year}`;
      })()
      : `FY ${selectedYear}-${String(selectedYear + 1).slice(-2)}`;

  const recentTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((left, right) => getTxDate(right) - getTxDate(left))
      .slice(0, 5);
  }, [filteredTransactions]);

  const categoryLookup = useMemo(() => {
    const lookup = new Map();

    categories.forEach((category) => {
      const keys = [category._id, category.id, category.name]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());

      keys.forEach((key) => {
        lookup.set(key, category);
      });
    });

    return lookup;
  }, [categories]);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((left, right) => {
      const leftProgress = Number(left.targetAmount || 0) > 0
        ? Number(left.currentAmount || 0) / Number(left.targetAmount || 0)
        : 0;
      const rightProgress = Number(right.targetAmount || 0) > 0
        ? Number(right.currentAmount || 0) / Number(right.targetAmount || 0)
        : 0;

      return rightProgress - leftProgress;
    });
  }, [goals]);

  const visibleGoals = useMemo(() => sortedGoals.slice(0, 3), [sortedGoals]);

  const activeGoalsCount = useMemo(() => {
    return goals.filter((goal) => {
      const target = Number(goal.targetAmount || 0);
      const current = Number(goal.currentAmount || 0);
      return !target || current < target;
    }).length;
  }, [goals]);

  const monthlySummary = useMemo(() => {
    const incomeTransactions = filteredTransactions
      .filter((tx) => tx.type === "income")
      .sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0));
    const expenseTransactions = filteredTransactions
      .filter((tx) => tx.type === "expense")
      .sort((left, right) => (Number(right.amount) || 0) - (Number(left.amount) || 0));
    const expenseDays = new Set(
      expenseTransactions.map((tx) => getTxDate(tx).toISOString().slice(0, 10))
    );
    const averageExpense = expenseDays.size > 0 ? totals.expense / expenseDays.size : 0;
    const savingsRate = totals.income > 0 ? (totals.balance / totals.income) * 100 : 0;

    return {
      highestIncome: incomeTransactions[0] || null,
      highestExpense: expenseTransactions[0] || null,
      totalTransactions: filteredTransactions.length,
      averageExpense,
      savingsRate,
    };
  }, [filteredTransactions, totals.balance, totals.expense, totals.income]);

  const investmentSummary = useMemo(() => {
    const activeInvestments = investments.filter((investment) => investment.status === "active");
    const upcomingContributions = activeInvestments
      .filter(
        (investment) =>
          investment.contributionType === "recurring" && isWithinDays(investment.nextDueDate, 30)
      )
      .sort((left, right) => new Date(left.nextDueDate) - new Date(right.nextDueDate));
    const upcomingMaturities = activeInvestments
      .filter((investment) => isWithinDays(investment.maturityDate, 90))
      .sort((left, right) => new Date(left.maturityDate) - new Date(right.maturityDate));
    const typeTotals = activeInvestments.reduce((acc, investment) => {
      const type = investment.type || "Other";
      acc[type] = (acc[type] || 0) + (Number(investment.totalInvested) || 0);
      return acc;
    }, {});
    const totalInvested = activeInvestments.reduce(
      (sum, investment) => sum + (Number(investment.totalInvested) || 0),
      0
    );
    const typeBreakdown = Object.entries(typeTotals)
      .map(([type, value], index) => ({
        type,
        value,
        percentage: totalInvested > 0 ? value / totalInvested : 0,
        color: INVESTMENT_TYPE_CHART_COLORS[index % INVESTMENT_TYPE_CHART_COLORS.length],
      }))
      .sort((left, right) => right.value - left.value);

    return {
      activeCount: activeInvestments.length,
      totalInvested,
      currentValue: activeInvestments.reduce(
        (sum, investment) => sum + (Number(investment.currentValue || investment.totalInvested) || 0),
        0
      ),
      insuranceCover: activeInvestments.reduce(
        (sum, investment) => sum + (Number(investment.insuranceCover) || 0),
        0
      ),
      linkedGoals: activeInvestments.filter((investment) => investment.goalId).length,
      upcomingContributionAmount: upcomingContributions.reduce(
        (sum, investment) => sum + (Number(investment.contributionAmount) || 0),
        0
      ),
      typeBreakdown,
      upcomingMaturityAmount: upcomingMaturities.reduce(
        (sum, investment) => sum + (Number(investment.currentValue || investment.totalInvested) || 0),
        0
      ),
      upcomingContributions: upcomingContributions.slice(0, 2),
      upcomingMaturities: upcomingMaturities.slice(0, 2),
    };
  }, [investments]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tx, gs, cs, inv] = await Promise.all([
        getTransactions(),
        getGoals(),
        getCategories(),
        getInvestments(),
      ]);
      setTransactions(tx);
      setGoals(gs);
      setCategories(cs);
      setInvestments(inv);
    } catch (e) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTransaction = async (payload) => {
    try {
      const created = await createTransaction(payload);
      setTransactions(prev => [created, ...prev]);
      setShowAddTx(false);
    } catch {
      setError("Failed to add transaction");
    }
  };

  const handleSubmitGoal = async (payload) => {
    try {
      if (editGoal) {
        const updated = await updateGoal(getGoalId(editGoal), payload);
        const updatedGoalId = getGoalId(updated) || getGoalId(editGoal);
        setGoals((prev) => prev.map((g) => (getGoalId(g) === updatedGoalId ? updated : g)));
      } else {
        const created = await createGoal(payload);
        setGoals((prev) => [created, ...prev]);
      }

      setShowGoalDrawer(false);
      setEditGoal(null);
    } catch {
      setError(editGoal ? "Failed to update goal" : "Failed to create goal");
    }
  };

  const handleUpdateGoal = (goal) => {
    setEditGoal(goal);
    setShowGoalDrawer(true);
  };

  const handleCreateCategory = async (payload) => {
    try {
      const created = await createCategory(payload);
      setCategories(prev => [created, ...prev]);
      setShowAddCategory(false);
    } catch {
      setError("Failed to create category");
    }
  };

  const handleOpenTransactions = () => {
    if (typeof onOpenTransactionsFromDashboard !== "function") return;

    onOpenTransactionsFromDashboard({
      prefetchedTransactions: filteredTransactions,
      prefillFilter: {
        mode: periodMode,
        fiscalYearStart: selectedYear,
        month: selectedMonth,
        periodLabel: selectedPeriodLabel,
      },
    });
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="flex-1 space-y-3 pb-2">
      {error && <div className="rounded-2xl bg-red-100 p-3 text-red-700">{error}</div>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          title={`Balance (${selectedPeriodLabel})`}
          value={formatCurrency(totals.balance)}
        />
        <KpiCard
          title="Income"
          value={<span style={{ color: "#16a34a" }}>{formatCurrency(totals.income)}</span>}
        />
        <KpiCard
          title="Expenses"
          value={<span style={{ color: "#dc2626" }}>{formatCurrency(totals.expense)}</span>}
        />
        <KpiCard
          title="Investment Value"
          value={<span style={{ color: "#0f766e" }}>{formatCurrency(investmentSummary.currentValue)}</span>}
        />
        <KpiCard
          title="Goals"
          value={<span style={{ color: "#2563eb" }}>{goals.length} Active</span>}
        />
        <KpiCard
          title="Categories"
          value={<span style={{ color: "#7c3aed" }}>{categories.length} Tracked</span>}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <DashboardCard
          title="Account Overview"
          className="h-full"
        >
          <div className="space-y-2">
            <div className="grid gap-3">
              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-500">Balance till today</p>
                  <div className="text-right text-[30px] font-semibold tracking-tight text-slate-900">
                    {formatCurrency(lifetimeTotals.balance)}
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-gradient-to-br from-white via-white to-emerald-50/40 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Period change</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{selectedPeriodLabel}</p>
                  </div>
                  <div className={`text-right text-[30px] font-semibold tracking-tight ${totals.balance >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {totals.balance >= 0 ? "+" : "-"}{formatCurrency(Math.abs(totals.balance))}
                  </div>
                </div>
              </div>
            </div>

            <div className="max-h-[324px] space-y-3 overflow-y-auto pr-1">
              {accountOverviewRows.map((bank) => {
                const isPositive = bank.currentBalance >= 0;
                const hasPeriodActivity = bank.periodTransactions > 0;
                const isPeriodPositive = bank.periodChange >= 0;

                return (
                  <div
                    key={bank.name}
                    className="flex items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{bank.name}</div>
                      <div className={`mt-1 text-xs font-medium ${hasPeriodActivity ? isPeriodPositive ? "text-emerald-600" : "text-rose-500" : "text-slate-400"}`}>
                        {hasPeriodActivity
                          ? `${isPeriodPositive ? "+" : "-"}${formatCurrency(Math.abs(bank.periodChange))} in ${selectedPeriodLabel}`
                          : `No change in ${selectedPeriodLabel}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-sm font-semibold ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
                        {isPositive ? "+" : "-"}{formatCurrency(Math.abs(bank.currentBalance))}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">Till today</div>
                    </div>
                  </div>
                );
              })}

              {accountOverviewRows.length === 0 ? (
                <div className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  No account activity yet
                </div>
              ) : null}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Investments Snapshot"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                Till today
              </span>
              <button
                type="button"
                onClick={() => navigateTo("investments")}
                className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                Open Investments
              </button>
            </div>
          }
          className="h-full xl:col-span-2"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Snapshot totals</div>
                <div className="mt-1 text-slate-500">All active investments till today</div>
              </div>
              <div className="text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">As of now</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[18px] border border-white/80 bg-white/90 px-4 py-4 text-sm shadow-sm">
                <div className="text-slate-400">Total invested</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {formatCurrency(investmentSummary.totalInvested)}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/80 bg-white/90 px-4 py-4 text-sm shadow-sm">
                <div className="text-slate-400">Current value</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(investmentSummary.currentValue)}</div>
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Investment Mix</div>
                  <div className="mt-1 text-sm text-slate-500">Active asset mix till today</div>
                </div>
                <div className="text-xs font-semibold text-slate-400">By type</div>
              </div>

              <div className="mt-4">
                {investmentSummary.typeBreakdown.length > 0 ? (() => {
                  const size = 176;
                  const strokeWidth = 18;
                  const radius = (size - strokeWidth) / 2;
                  const circumference = 2 * Math.PI * radius;
                  let consumed = 0;

                  return (
                    <div className="grid gap-5 lg:grid-cols-[188px_minmax(0,1fr)] lg:items-center">
                      <div className="mx-auto flex w-full max-w-[188px] justify-center">
                        <div className="relative h-44 w-44">
                          <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44 -rotate-90">
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              fill="none"
                              stroke="#e2e8f0"
                              strokeWidth={strokeWidth}
                            />
                            {investmentSummary.typeBreakdown.map((item) => {
                              const segment = item.percentage * circumference;
                              const dashArray = `${segment} ${Math.max(circumference - segment, 0)}`;
                              const dashOffset = -consumed;
                              consumed += segment;

                              return (
                                <circle
                                  key={item.type}
                                  cx={size / 2}
                                  cy={size / 2}
                                  r={radius}
                                  fill="none"
                                  stroke={item.color}
                                  strokeWidth={strokeWidth}
                                  strokeLinecap="butt"
                                  strokeDasharray={dashArray}
                                  strokeDashoffset={dashOffset}
                                />
                              );
                            })}
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Till today</div>
                            <div className="mt-1 px-4 text-lg font-semibold leading-tight text-slate-900">
                              {formatCurrency(investmentSummary.totalInvested)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {investmentSummary.typeBreakdown.map((item) => (
                          <div key={item.type} className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-3 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-800">{item.type}</div>
                                <div className="text-xs text-slate-400">{(item.percentage * 100).toFixed(0)}%</div>
                              </div>
                            </div>
                            <div className="text-right text-sm font-semibold text-slate-900">
                              {formatCurrency(item.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="rounded-[18px] bg-white px-3 py-6 text-center text-sm text-slate-500">
                    No active investment types yet
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Upcoming Contributions</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {formatCurrency(investmentSummary.upcomingContributionAmount)}
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Next 30 days
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {investmentSummary.upcomingContributions.length > 0 ? investmentSummary.upcomingContributions.map((investment) => (
                    <div key={investment.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{investment.name}</div>
                        <div className="text-xs text-slate-500">{investment.institution}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-800">{formatCurrency(investment.contributionAmount)}</div>
                        <div className="text-xs text-slate-400">{formatShortDate(investment.nextDueDate)}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[18px] bg-white px-3 py-6 text-center text-sm text-slate-500">
                      No recurring contributions due soon
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Upcoming Maturity</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900">
                      {formatCurrency(investmentSummary.upcomingMaturityAmount)}
                    </div>
                  </div>
                  <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Next 90 days
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {investmentSummary.upcomingMaturities.length > 0 ? investmentSummary.upcomingMaturities.map((investment) => (
                    <div key={investment.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{investment.name}</div>
                        <div className="text-xs text-slate-500">{investment.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-800">{formatShortDate(investment.maturityDate)}</div>
                        <div className="text-xs text-slate-400">{formatCurrency(investment.currentValue || investment.totalInvested)}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[18px] bg-white px-3 py-6 text-center text-sm text-slate-500">
                      No maturity events due soon
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-200 px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-slate-900">{investmentSummary.linkedGoals}</span>
                <span className="ml-1 text-slate-500">investments linked to goals till today</span>
              </div>
              <button
                type="button"
                onClick={() => navigateTo("investments")}
                className="font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                Review assets and reminders
              </button>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Recent Transactions"
          action={
            <button
              type="button"
              onClick={handleOpenTransactions}
              className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              View All
            </button>
          }
          className="h-full xl:col-span-1"
        >
          <div className="divide-y divide-slate-200/80">
            {recentTransactions.map((transaction) => {
              const amount = Number(transaction.amount) || 0;
              const isExpense = transaction.type === "expense";
              const matchedCategory = categoryLookup.get(
                String(transaction.category || transaction.categoryId || "").trim().toLowerCase()
              );
              const iconKey = matchedCategory?.icon || DEFAULT_TX_ICON_BY_TYPE[transaction.type] || "cash";
              const iconPath = getIconPathByKey(iconKey) || getIconPathByKey("cash");
              const iconContainerStyle = matchedCategory?.color
                ? {
                  backgroundColor: matchedCategory.color,
                  color: "#ffffff",
                }
                : undefined;

              return (
                <div key={getTransactionId(transaction)} className="flex items-center justify-between gap-3 py-4 first:pt-1 last:pb-1">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl text-base font-semibold ${matchedCategory?.color ? "" : isExpense ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"}`}
                      style={iconContainerStyle}
                    >
                      <Icon path={iconPath} size={0.82} color="currentColor" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{transaction.title || transaction.category || "Transaction"}</div>
                      <div className="text-xs text-slate-500">{transaction.type === "expense" ? "Expense" : "Income"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${isExpense ? "text-rose-500" : "text-emerald-600"}`}>
                      {isExpense ? "-" : "+"}{formatCurrency(amount)}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{formatShortDate(transaction.date || transaction.createdAt || Date.now())}</div>
                  </div>
                </div>
              );
            })}

            {recentTransactions.length === 0 ? (
              <div className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
                No transactions for this period
              </div>
            ) : null}
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <DashboardCard
          title="Top Spending Categories"
          action={
            <button
              type="button"
              onClick={() => navigateTo("categories")}
              className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              View All
            </button>
          }
          className="h-full"
        >
          <div className="space-y-5">
            {categoryPieData.items.slice(0, 5).map((item) => (
              <div key={item.name} className="grid grid-cols-[minmax(0,112px)_minmax(0,1fr)_auto] items-center gap-3">
                <div className="truncate text-sm font-medium text-slate-700">{item.name}</div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(item.percentage * 100, 8)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold text-slate-800">{formatCurrency(item.value)}</div>
                  <div className="text-xs text-slate-400">{(item.percentage * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}

            {categoryPieData.items.length === 0 ? (
              <div className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
                No spending categories yet
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard title="Monthly Summary" className="h-full">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Highest Income</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">
                {monthlySummary.highestIncome ? formatCurrency(monthlySummary.highestIncome.amount) : "-"}
              </div>
              <div className="mt-1 text-sm text-slate-500">{monthlySummary.highestIncome?.category || "No income yet"}</div>
            </div>

            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Highest Expense</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">
                {monthlySummary.highestExpense ? formatCurrency(monthlySummary.highestExpense.amount) : "-"}
              </div>
              <div className="mt-1 text-sm text-slate-500">{monthlySummary.highestExpense?.category || "No expenses yet"}</div>
            </div>

            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Transactions</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{monthlySummary.totalTransactions}</div>
              <div className="mt-1 text-sm text-emerald-600">In {selectedPeriodLabel}</div>
            </div>

            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Savings Rate</div>
              <div className="mt-3 text-lg font-semibold text-slate-900">{monthlySummary.savingsRate.toFixed(1)}%</div>
              <div className={`mt-1 text-sm ${monthlySummary.savingsRate >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                Avg expense {formatCurrency(monthlySummary.averageExpense)}
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Goals Overview"
          action={
            <button
              type="button"
              onClick={() => navigateTo("goals")}
              className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              View All
            </button>
          }
          className="h-full xl:col-span-2"
        >
          <div className="space-y-6">
            {visibleGoals.map((goal, index) => {
              const goalId = getGoalId(goal);
              const target = Number(goal.targetAmount || 0);
              const current = Number(goal.currentAmount || 0);
              const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              const theme = GOAL_STYLE_TOKENS[index % GOAL_STYLE_TOKENS.length];
              const iconPath = getIconPathByKey(goal.icon || DEFAULT_GOAL_ICON);

              return (
                <button
                  key={goalId}
                  type="button"
                  onClick={() => handleUpdateGoal(goal)}
                  aria-label={`Edit ${goal.name || "goal"}`}
                  className="block w-full text-left"
                >
                  <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${theme.iconBg} ${theme.iconText}`}>
                      {iconPath ? <Icon path={iconPath} size={1.05} color="currentColor" /> : <span>•</span>}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[18px] font-semibold text-slate-900">
                        {goal.name || "Untitled Goal"}
                      </div>
                      <div className="mt-1 truncate text-[13px] font-medium text-slate-500">
                        Target: {formatDeadline(goal.deadline)}
                      </div>
                    </div>

                    <div className="text-right text-[16px] font-semibold text-slate-800">
                      {formatCurrency(current)} <span className="text-slate-400">/ {formatCurrency(target)}</span>
                    </div>

                    <div />

                    <div className="col-span-2 flex items-center gap-4">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-[16px] font-semibold text-slate-700">{progress}%</div>
                    </div>
                  </div>
                </button>
              );
            })}

            {goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-slate-500">
                <p>Start by creating your first savings goal.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditGoal(null);
                    setShowGoalDrawer(true);
                  }}
                  className="mt-3 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  Create Goal
                </button>
              </div>
            ) : null}

            {goals.length > 0 ? (
              <div className="flex items-center justify-between pt-2 text-[18px] font-semibold">
                <span className="text-emerald-600">{activeGoalsCount} Active Goals</span>
                <span className="text-slate-500">Of {goals.length}</span>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard title="Quick Actions" className="xl:col-start-5 ">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowAddTx(true)}
              className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
            >
              <div className="text-sm font-semibold text-slate-900">Add Transaction</div>
              <div className="mt-1 text-xs text-slate-500">Log new income or expense</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditGoal(null);
                setShowGoalDrawer(true);
              }}
              className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
            >
              <div className="text-sm font-semibold text-slate-900">Add Goal</div>
              <div className="mt-1 text-xs text-slate-500">Create a new savings target</div>
            </button>
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
            >
              <div className="text-sm font-semibold text-slate-900">Add Category</div>
              <div className="mt-1 text-xs text-slate-500">Track a new spending bucket</div>
            </button>
            <button
              type="button"
              onClick={() => navigateTo("investments")}
              className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
            >
              <div className="text-sm font-semibold text-slate-900">Open Investments</div>
              <div className="mt-1 text-xs text-slate-500">Manage long-term assets, maturity, and reminders</div>
            </button>
          </div>
        </DashboardCard>

      </section>

      <AddTransactionModal
        open={showAddTx}
        onClose={() => setShowAddTx(false)}
        onSubmit={handleAddTransaction}
        categories={categories}
        goals={goals}
      />

      <GoalFormDrawer
        open={showGoalDrawer}
        onClose={() => {
          setShowGoalDrawer(false);
          setEditGoal(null);
        }}
        onSubmit={handleSubmitGoal}
        initialValues={editGoal}
        title={editGoal ? "Edit Goal" : "Add Goal"}
        submitLabel={editGoal ? "Update" : "Add"}
      />

      <CategoryFormDrawer
        open={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSubmit={handleCreateCategory}
        title="Add Category"
        submitLabel="Add"
      />
    </main>
  );
}
