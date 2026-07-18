import React, { useEffect, useMemo, useState } from "react";
import Icon from "@mdi/react";
import { useNotificationStore } from "../store/notificationStore";
import { KpiCard, SectionCard } from "../components/common";
import AddTransactionModal from "../components/AddTransactionModal";
import GoalFormDrawer from "../components/GoalFormDrawer";
import CategoryFormDrawer from "../components/CategoryFormDrawer";
import FinancialAccountFormDrawer from "../components/FinancialAccountFormDrawer";
import { getIconPathByKey } from "../constants/categoryIcons";
import { navigateTo } from "../services/navigation";

import { getTransactions, createTransaction } from "../api/transactions";
import { getGoals, createGoal, updateGoal } from "../api/goals";
import { getCategories, createCategory } from "../api/categories";
import { getFinancialAccounts } from "../api/financialAccounts";
import { getInvestments, createInvestment } from "../api/investments";
import { getInvestmentAssetTaxonomy } from "../api/investmentAssetTaxonomy";
import { buildInvestmentFromForm, getInvestmentCategoryOptions } from "../utils/investmentHelpers";
import { getRuntimeErrorMessage } from "../utils/errorMessage";
import {
  PAGE_MONTH_OPTIONS,
  FISCAL_YEAR_START_MONTH,
  usePageDateFilterStore,
  matchesPageDateFilter,
} from "../store/pageDateFilterStore";
import InvestmentFormDrawer from "../components/InvestmentFormDrawer";

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
const summarizeSources = (items, accountNameById = {}) => {
  return items.reduce((acc, item) => {
    const sourceId = Number(item.sourceAccountId);
    const sourceName =
      accountNameById[sourceId] ||
      String(item.source || "Unknown source").trim() ||
      "Unknown source";

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

export default function Dashboard({ onOpenTransactionsFromDashboard }) {
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [taxonomyNodes, setTaxonomyNodes] = useState([]);
  const periodMode = usePageDateFilterStore((state) => state.mode);
  const selectedYear = usePageDateFilterStore((state) => state.selectedYear);
  const selectedMonth = usePageDateFilterStore((state) => state.selectedMonth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showGoalDrawer, setShowGoalDrawer] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [showInvestments, setShowInvestments] = useState(false);
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const accountNameById = useMemo(
    () =>
      accounts.reduce((acc, account) => {
        acc[Number(account.id)] = account.displayName || account.institutionName || account.name;
        return acc;
      }, {}),
    [accounts]
  );

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
    return summarizeSources(filteredTransactions, accountNameById);
  }, [filteredTransactions, accountNameById]);

  const lifetimeBankSummaries = useMemo(() => {
    return summarizeSources(transactions, accountNameById);
  }, [transactions, accountNameById]);

  const accountOverviewRows = useMemo(() => {
    const allSources = new Set([
      ...accounts.map((account) => account.displayName || account.institutionName || account.name),
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
  }, [accounts, lifetimeBankSummaries, periodBankSummaries]);

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
    return {
      total,
      items: items.map((item) => ({
        ...item,
        percentage: total > 0 ? item.value / total : 0,
      })),
    };
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

  const categoryLabelMap = useMemo(() => {
    const map = {};
    getInvestmentCategoryOptions(taxonomyNodes)
      .filter((opt) => opt.value !== 'all')
      .forEach((opt) => { map[opt.value] = opt.label; });
    return map;
  }, [taxonomyNodes]);

  const investmentPeriodBounds = useMemo(() => {
    if (periodMode === 'monthly') {
      const { year, month } = resolveFiscalMonthYear(selectedYear, selectedMonth);
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    }
    return {
      start: new Date(selectedYear, FISCAL_YEAR_START_MONTH, 1),
      end: new Date(selectedYear + 1, FISCAL_YEAR_START_MONTH, 0, 23, 59, 59, 999),
    };
  }, [periodMode, selectedYear, selectedMonth]);

  const investmentSummary = useMemo(() => {
    const { start: periodStart, end: periodEnd } = investmentPeriodBounds;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // All active investments (for snapshot card and allocation breakdown)
    const allActiveInvestments = investments.filter((inv) => inv.status === 'active');
    
    // Period-scoped portfolio metrics: only investments started within the selected period
    const periodInvestments = allActiveInvestments.filter((inv) => {
      const startDate = inv.startDate ? new Date(inv.startDate) : null;
      return startDate && startDate >= periodStart && startDate <= periodEnd;
    });
    
    const periodTotalInvested = periodInvestments.reduce((sum, inv) => sum + (Number(inv.totalInvested) || 0), 0);
    const periodCurrentValue = periodInvestments.reduce((sum, inv) => sum + (Number(inv.currentValue || inv.totalInvested) || 0), 0);
    const periodUnrealisedGain = periodCurrentValue - periodTotalInvested;
    const periodUnrealisedGainPct = periodTotalInvested > 0 ? (periodUnrealisedGain / periodTotalInvested) * 100 : 0;
    
    // All-time metrics (for allocation breakdown reference)
    const totalInvested = allActiveInvestments.reduce((sum, inv) => sum + (Number(inv.totalInvested) || 0), 0);
    const currentValue = allActiveInvestments.reduce((sum, inv) => sum + (Number(inv.currentValue || inv.totalInvested) || 0), 0);
    const unrealisedGain = currentValue - totalInvested;
    const unrealisedGainPct = totalInvested > 0 ? (unrealisedGain / totalInvested) * 100 : 0;

    const categoryTotals = allActiveInvestments.reduce((acc, inv) => {
      const key = inv.assetCategory || inv.category || 'other';
      acc[key] = (acc[key] || 0) + (Number(inv.totalInvested) || 0);
      return acc;
    }, {});
    const allocationBreakdown = Object.entries(categoryTotals)
      .map(([key, value]) => ({ key, label: categoryLabelMap[key] || key, value, pct: totalInvested > 0 ? (value / totalInvested) * 100 : 0 }))
      .sort((l, r) => r.value - l.value);

    // Action items are period-scoped (contributions/maturities due in period)
    const periodActionInvestments = allActiveInvestments.filter((inv) => {
      const startDate = inv.startDate ? new Date(inv.startDate) : null;
      return !startDate || startDate <= periodEnd;
    });

    const upcomingContributions = periodActionInvestments
      .filter((inv) => {
        const d = inv.activeContributionPlan?.nextDueDate;
        if (!d) return false;
        const due = new Date(d);
        return due >= periodStart && due <= periodEnd;
      })
      .sort((l, r) => new Date(l.activeContributionPlan.nextDueDate) - new Date(r.activeContributionPlan.nextDueDate));

    const overdueContributions = periodActionInvestments
      .filter((inv) => {
        if (!inv.activeContributionPlan?.nextDueDate) return false;
        const d = new Date(inv.activeContributionPlan.nextDueDate);
        d.setHours(0, 0, 0, 0);
        return d < today;
      })
      .sort((l, r) => new Date(l.activeContributionPlan.nextDueDate) - new Date(r.activeContributionPlan.nextDueDate));

    const upcomingMaturities = periodActionInvestments
      .filter((inv) => {
        if (!inv.maturityDate) return false;
        const d = new Date(inv.maturityDate);
        return d >= periodStart && d <= periodEnd;
      })
      .sort((l, r) => new Date(l.maturityDate) - new Date(r.maturityDate));

    const allContribDue = [...overdueContributions, ...upcomingContributions.filter(
      (inv) => !overdueContributions.find((o) => o.id === inv.id)
    )].slice(0, 3);

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
      insuranceCover: allActiveInvestments.reduce((sum, inv) => sum + (Number(inv.insuranceCover) || 0), 0),
      allocationBreakdown,
      upcomingContributionAmount: upcomingContributions.reduce((sum, inv) => sum + (Number(inv.activeContributionPlan.amount) || 0), 0),
      upcomingMaturities: upcomingMaturities.slice(0, 3),
      upcomingMaturityAmount: upcomingMaturities.reduce((sum, inv) => sum + (Number(inv.currentValue || inv.totalInvested) || 0), 0),
      allContribDue,
      overdueCount: overdueContributions.length,
    };
  }, [investments, investmentPeriodBounds, categoryLabelMap]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tx, gs, cs, ac, inv, taxonomy] = await Promise.all([
        getTransactions(),
        getGoals(),
        getCategories(),
        getFinancialAccounts(),
        getInvestments(),
        getInvestmentAssetTaxonomy(),
      ]);
      setTransactions(
        Array.isArray(tx)
          ? tx.map((item) => ({
              ...item,
              category: item.category || item.categoryLabelSnapshot || "",
            }))
          : []
      );
      setGoals(gs);
      setCategories(cs);
      setAccounts(Array.isArray(ac) ? ac : []);
      setInvestments(inv);
      setTaxonomyNodes(Array.isArray(taxonomy) ? taxonomy : []);
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
      const sourceAccountId = Number(payload?.source);
      const goalId = Number(payload?.goalId);
      const created = await createTransaction({
        type: payload?.type,
        amount: Number(payload?.amount || 0),
        categoryId: Number(payload?.categoryId),
        categoryLabelSnapshot: String(payload?.category || '').trim(),
        transactionKind: payload?.type === 'income' ? 'credit' : 'debit',
        sourceAccountId: Number.isNaN(sourceAccountId) ? undefined : sourceAccountId,
        date: payload?.date ? new Date(payload.date).toISOString() : new Date().toISOString(),
        notes: payload?.notes || '',
        goalId: Number.isNaN(goalId) ? null : goalId,
      });
      setTransactions(prev => [created, ...prev]);
      setShowAddTx(false);
      return null;
    } catch (error) {
      return getRuntimeErrorMessage(error, "Failed to add transaction");
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
      return null;
    } catch (error) {
      return getRuntimeErrorMessage(error, editGoal ? "Failed to update goal" : "Failed to create goal");
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
      return null;
    } catch (error) {
      return getRuntimeErrorMessage(error, "Failed to create category");
    }
  };

  const handleInvestmentsUpdated = async () => {
    const nextInvestments = await getInvestments();
    setInvestments(Array.isArray(nextInvestments) ? nextInvestments : []);
  };

  const handleSaveInvestment = async (formValues) => {
    try {
      const nextInvestment = buildInvestmentFromForm(formValues, null, taxonomyNodes);
      await createInvestment(nextInvestment);
      await handleInvestmentsUpdated();
      setShowInvestments(false);
      return null;
    } catch (error) {
      return getRuntimeErrorMessage(error, "Failed to add investment");
    }
  };

  const handleOpenAddAccount = () => {
    setEditAccount(null);
    setShowAccountDrawer(true);
  };

  const handleOpenEditAccount = (accountName) => {
    const matchedAccount = accounts.find(
      (account) => (account.displayName || account.institutionName || account.name) === accountName
    );

    if (!matchedAccount) return;

    setEditAccount(matchedAccount);
    setShowAccountDrawer(true);
  };

  const handleAccountsUpdated = async () => {
    try {
      const nextAccounts = await getFinancialAccounts();
      setAccounts(Array.isArray(nextAccounts) ? nextAccounts : []);
    } catch (error) {
      pushNotification({ type: "error", message: getRuntimeErrorMessage(error, "Failed to refresh accounts") });
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

  const handleOpenAddTransactionDrawer = () => {
    if (categories.length === 0) {
      const message = "Add at least one category before creating a transaction.";
      setError(message);
      pushNotification({ type: "warning", message });
      return;
    }

    if (accounts.length === 0) {
      const message = "Add at least one financial account before creating a transaction.";
      setError(message);
      pushNotification({ type: "warning", message });
      return;
    }

    setShowAddTx(true);
  };

  const handleOpenAddInvestmentDrawer = () => {
    if (accounts.length === 0) {
      const message = "Add at least one financial account before creating an investment.";
      setError(message);
      pushNotification({ type: "warning", message });
      return;
    }

    setShowInvestments(true);
  };

  const hasOverlayOpen =
    showAddTx ||
    showGoalDrawer ||
    showAddCategory ||
    showAccountDrawer ||
    showInvestments;

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="flex-1 space-y-3 pb-2">
      {error && !hasOverlayOpen ? <div className="rounded-2xl bg-red-100 p-3 text-red-700">{error}</div> : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <KpiCard
          title={`Balance`}
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
          title={`Portfolio Value`}
          value={
            <div className="space-y-1">
              <div style={{ fontSize: "18px", fontWeight: "600", color: investmentSummary.periodCurrentValue >= investmentSummary.periodTotalInvested ? "#16a34a" : "#dc2626" }}>
                {formatCurrency(investmentSummary.periodCurrentValue)}
              </div>
            </div>
          }
        />
        <KpiCard
          title="Investment"
          value={<span style={{ color: "#dc2626" }}>{formatCurrency(investmentSummary.periodTotalInvested)}</span>}
        />
        <KpiCard
          title={`Investment Return`}
          value={
            <div className="space-y-1">
              <div style={{ fontSize: "18px", fontWeight: "600", color: investmentSummary.periodUnrealisedGainPct >= 0 ? "#16a34a" : "#dc2626" }}>
                {formatCurrency(investmentSummary.periodUnrealisedGain)} ({investmentSummary.periodUnrealisedGainPct >= 0 ? "+" : ""}{investmentSummary.periodUnrealisedGainPct.toFixed(1)}%)
              </div>
            </div>
          }
        />
        <KpiCard
          title="Goals"
          value={<span style={{ color: "#2563eb" }}>{goals.length} Active</span>}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <SectionCard
          title="Account Overview"
          action={
            <button
              type="button"
              onClick={handleOpenAddAccount}
              className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              Add Account
            </button>
          }
          className="h-full shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          empty={accountOverviewRows.length === 0}
          emptyState={{
            title: "No account activity yet",
            description: "Add a financial account and record transactions to populate balance and period movement.",
            actionLabel: "Add Account",
            onAction: handleOpenAddAccount,
          }}
        >
          <div className="space-y-2">
            <div className="grid gap-3">
              <div className="rounded-[24px] border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-500">Balance till today</p>
                  <div className="text-right text-[30px] font-semibold tracking-tight text-slate-900">
                    {formatCurrency(lifetimeTotals.balance)}
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-100 bg-gradient-to-br from-white via-white to-emerald-50/40">
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
                  <button
                    type="button"
                    onClick={() => handleOpenEditAccount(bank.name)}
                    key={bank.name}
                    className="flex w-full items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-left"
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
                  </button>
                );
              })}

              {accountOverviewRows.length === 0 ? (
                <div className="rounded-[24px] bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
                  No account activity yet
                </div>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Investments Snapshot"
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                {selectedPeriodLabel}
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
          className="h-full xl:col-span-2 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          empty={investments.length === 0}
          emptyState={{
            title: "No investments tracked yet",
            description: "Add your first investment to see portfolio value, allocation mix, upcoming contributions, and maturity signals.",
            actionLabel: "Add Investment",
            onAction: handleOpenAddInvestmentDrawer,
          }}
        >
          <div className="space-y-4">

            {/* Portfolio Health — always as of today */}
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Portfolio Value · as of today</div>
                <div className="mt-1.5 text-xl font-semibold text-slate-900">{formatCurrency(investmentSummary.currentValue)}</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Invested {formatCurrency(investmentSummary.totalInvested)}
                  <span className={`ml-2 font-semibold ${
                    investmentSummary.unrealisedGain >= 0 ? 'text-emerald-600' : 'text-rose-500'
                  }`}>
                    {investmentSummary.unrealisedGain >= 0 ? '+' : ''}{formatCurrency(investmentSummary.unrealisedGain)}
                    {' '}({investmentSummary.unrealisedGainPct >= 0 ? '+' : ''}{investmentSummary.unrealisedGainPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Allocation Mix — always as of today */}
            <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Allocation Mix</div>
                <div className="text-[11px] font-semibold text-slate-400">By category</div>
              </div>
              {investmentSummary.allocationBreakdown.length > 0 ? (
                <div className="space-y-2.5">
                  {investmentSummary.allocationBreakdown.map((item, index) => (
                    <div key={item.key} className="grid grid-cols-[80px_minmax(0,1fr)_56px_72px] items-center gap-2">
                      <div className="truncate text-xs font-medium text-slate-700">{item.label}</div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(item.pct, 4)}%`,
                            backgroundColor: INVESTMENT_TYPE_CHART_COLORS[index % INVESTMENT_TYPE_CHART_COLORS.length],
                          }}
                        />
                      </div>
                      <div className="text-right text-[11px] font-semibold text-slate-500">{item.pct.toFixed(0)}%</div>
                      <div className="text-right text-xs font-semibold text-slate-800">{formatCurrency(item.value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-3 text-center text-sm text-slate-400">No active allocations</div>
              )}
            </div>

            {/* Action Items — scoped to selected period */}
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">In {selectedPeriodLabel}</div>
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Due contributions */}
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Due This Month</div>
                  {investmentSummary.overdueCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                      {investmentSummary.overdueCount} overdue
                    </span>
                  )}
                </div>
                {investmentSummary.allContribDue.length > 0 ? (
                  <div className="space-y-2">
                    {investmentSummary.allContribDue.map((inv) => {
                      const dueDate = new Date(inv.activeContributionPlan.nextDueDate);
                      dueDate.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isOverdue = dueDate < today;
                      return (
                        <div key={inv.id} className="flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-slate-900">{inv.name}</div>
                            <div className={`text-[10px] font-medium ${ isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                              {isOverdue ? 'Overdue · ' : ''}{formatShortDate(inv.activeContributionPlan.nextDueDate)}
                            </div>
                          </div>
                          <div className={`text-xs font-semibold ${ isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                            {formatCurrency(inv.activeContributionPlan.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-slate-400">No contributions due this month</div>
                )}
              </div>

              {/* Maturing soon */}
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Maturing Soon</div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">90 days</span>
                </div>
                {investmentSummary.upcomingMaturities.length > 0 ? (
                  <div className="space-y-2">
                    {investmentSummary.upcomingMaturities.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-900">{inv.name}</div>
                          <div className="text-[10px] text-slate-400">{inv.institutionName || inv.institution}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-amber-700">{formatShortDate(inv.maturityDate)}</div>
                          <div className="text-[10px] text-slate-400">{formatCurrency(inv.currentValue || inv.totalInvested)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-slate-400">No maturities in next 90 days</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-slate-200 px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-slate-900">{investmentSummary.activeCount}</span>
                <span className="ml-1 text-slate-500">active investments tracked</span>
                {investmentSummary.insuranceCover > 0 && (
                  <span className="ml-2 text-slate-400">· {formatCurrency(investmentSummary.insuranceCover)} insured</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigateTo("investments")}
                className="font-semibold text-emerald-600 transition hover:text-emerald-700"
              >
                Review assets →
              </button>
            </div>
          </div>
        </SectionCard>
        <SectionCard
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
          className="h-full xl:col-span-1 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          empty={recentTransactions.length === 0}
          emptyState={{
            title: "No transactions in this period",
            description: "Add an income or expense to start building recent activity for the selected period.",
            actionLabel: "Add Transaction",
            onAction: handleOpenAddTransactionDrawer,
          }}
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

          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SectionCard
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
          className="h-full shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          empty={categoryPieData.items.length === 0}
          emptyState={{
            title: "No spending data for this period",
            description: "Once expense transactions are recorded, your top spending categories will appear here.",
          }}
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

          </div>
        </SectionCard>
        <SectionCard
          title="Monthly Summary"
          className="h-full shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          empty={monthlySummary.totalTransactions === 0}
          emptyState={{
            title: "No monthly summary yet",
            description: "Record income and expenses to generate highlights for highest income, highest expense, and savings rate.",
          }}
        >
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
        </SectionCard>

        <SectionCard
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
          className="h-full xl:col-span-2 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          empty={goals.length === 0}
          emptyState={{
            title: "No goals yet",
            description: "Create your first savings goal to track progress, deadlines, and funding momentum.",
            actionLabel: "Create Goal",
            onAction: () => {
              setEditGoal(null);
              setShowGoalDrawer(true);
            },
          }}
        >
          <div className="space-y-2">
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-left transition hover:bg-slate-50/80"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold ${theme.iconBg} ${theme.iconText}`}>
                        {iconPath ? <Icon path={iconPath} size={0.95} color="currentColor" /> : <span>•</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {goal.name || "Untitled Goal"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          Target: {formatDeadline(goal.deadline)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-1 pl-4">
                      <div className="text-right text-xs font-semibold text-slate-700">{progress}%</div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-300">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 text-right">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{formatCurrency(current)}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{formatCurrency(target)}</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {goals.length > 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3 text-sm font-semibold mt-2">
                <span className="text-emerald-600">{activeGoalsCount} Active Goals</span>
                <span className="text-slate-500">Of {goals.length}</span>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Quick Actions"
          className="xl:col-start-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          empty={
            categories.length === 0 &&
            goals.length === 0 &&
            transactions.length === 0 &&
            investments.length === 0
          }
          emptyState={{
            title: "No data yet",
            description: "Start by adding a transaction, goal, category, or investment to activate quick actions.",
            actionLabel: "Add Transaction",
            onAction: handleOpenAddTransactionDrawer,
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleOpenAddTransactionDrawer}
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
              onClick={handleOpenAddInvestmentDrawer}
              className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
            >
              <div className="text-sm font-semibold text-slate-900">Add Investments</div>
              <div className="mt-1 text-xs text-slate-500">Manage long-term assets, maturity, and reminders</div>
            </button>
          </div>
        </SectionCard>

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

      <InvestmentFormDrawer
        open={showInvestments}
        onClose={() => setShowInvestments(false)}
        onSubmit={handleSaveInvestment}
        initialValues={null}
        accounts={accounts}
        taxonomyNodes={taxonomyNodes}
        title="Add Investment"
        submitLabel="Add"
      />

      <FinancialAccountFormDrawer
        open={showAccountDrawer}
        onClose={() => {
          setShowAccountDrawer(false);
          setEditAccount(null);
        }}
        initialValues={editAccount}
        onUpdated={handleAccountsUpdated}
        title={editAccount ? "Edit Account" : "Add Account"}
        submitLabel={editAccount ? "Update" : "Add"}
      />
    </main>
  );
}
