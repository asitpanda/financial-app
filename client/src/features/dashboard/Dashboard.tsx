// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNotificationStore } from "../../store/notificationStore";
import { useDashboard } from "./useDashboard";
import AddTransactionModal from "../transactions/components/TransactionsAddEditDrawer";
import GoalFormDrawer from "../goals/components/GoalFormDrawer";
import CategoryFormDrawer from "../categories/components/CategoriesFormDrawer";
import FinancialAccountFormDrawer from "../accounts/components/FinancialAccountFormDrawer";
import { getFinancialAccounts } from "../accounts/financialAccounts.api";

import { saveTransaction } from "../transactions/transactions.service";
import { createGoal, updateGoal } from "../goals/goals.api";
import { createCategory } from "../categories/categories.api";
import {
  createInvestment,
  getInvestments,
} from "../investments/api/investments.api";
import {
  buildInvestmentFromForm,
  getInvestmentCategoryOptions,
} from "../../utils/investmentHelpers";
import { getRuntimeErrorMessage } from "../../utils/errorMessage";
import { navigateTo } from "../../services/navigation";
import {
  usePageDateFilterStore,
  matchesPageDateFilter,
} from "../../store/pageDateFilterStore";
import InvestmentFormDrawer from "../investments/components/InvestmentFormDrawer";
import {
  getDashboardAccountOverviewRows,
  getDashboardActiveGoalsCount,
  getDashboardCategoryLookup,
  getDashboardCategoryPieData,
  getDashboardFilteredTransactions,
  getDashboardInvestmentPeriodBounds,
  getDashboardInvestmentSummary,
  getDashboardMonthlySummary,
  getDashboardPeriodLabel,
  getDashboardRecentTransactions,
  getDashboardSortedGoals,
  getDashboardVisibleGoals,
} from "./dashboard.selectors";
import DashboardAccountsSection from "./components/DashboardAccountsSection";
import DashboardGoalsOverviewSection from "./components/DashboardGoalsOverviewSection";
import DashboardInvestmentsSection from "./components/DashboardInvestmentsSection";
import DashboardKpiStrip from "./components/DashboardKpiStrip";
import DashboardMonthlySummarySection from "./components/DashboardMonthlySummarySection";
import DashboardQuickActionsSection from "./components/DashboardQuickActionsSection";
import DashboardRecentTransactionsSection from "./components/DashboardRecentTransactionsSection";
import DashboardTopCategoriesSection from "./components/DashboardTopCategoriesSection";

const getGoalId = (goal) => goal?._id || goal?.id;
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

  const {
    data: dashboardData,
    loading,
    error: dashboardQueryError,
  } = useDashboard();
  const [error, setError] = useState("");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showGoalDrawer, setShowGoalDrawer] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [showInvestments, setShowInvestments] = useState(false);
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );

  useEffect(() => {
    if (!dashboardData) return;

    setTransactions(
      Array.isArray(dashboardData.transactions)
        ? dashboardData.transactions.map((item) => ({
            ...item,
            category: item.category || item.categoryLabelSnapshot || "",
          }))
        : [],
    );
    setGoals(Array.isArray(dashboardData.goals) ? dashboardData.goals : []);
    setCategories(
      Array.isArray(dashboardData.categories) ? dashboardData.categories : [],
    );
    setAccounts(
      Array.isArray(dashboardData.accounts) ? dashboardData.accounts : [],
    );
    setInvestments(
      Array.isArray(dashboardData.investments) ? dashboardData.investments : [],
    );
    setTaxonomyNodes(
      Array.isArray(dashboardData.taxonomyNodes)
        ? dashboardData.taxonomyNodes
        : [],
    );
  }, [dashboardData]);

  useEffect(() => {
    if (dashboardQueryError) {
      setError("Failed to load dashboard");
    }
  }, [dashboardQueryError]);

  const accountNameById = useMemo(
    () =>
      accounts.reduce((acc, account) => {
        acc[Number(account.id)] =
          account.displayName || account.institutionName || account.name;
        return acc;
      }, {}),
    [accounts],
  );

  const filteredTransactions = useMemo(() => {
    return getDashboardFilteredTransactions(
      transactions,
      periodMode,
      selectedYear,
      selectedMonth,
      matchesPageDateFilter,
    );
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
    return getDashboardAccountOverviewRows(
      accounts,
      lifetimeBankSummaries,
      periodBankSummaries,
    );
  }, [accounts, lifetimeBankSummaries, periodBankSummaries]);

  const categoryPieData = useMemo(() => {
    return getDashboardCategoryPieData(filteredTransactions);
  }, [filteredTransactions]);

  const selectedPeriodLabel = useMemo(
    () => getDashboardPeriodLabel(periodMode, selectedYear, selectedMonth),
    [periodMode, selectedYear, selectedMonth],
  );

  const recentTransactions = useMemo(() => {
    return getDashboardRecentTransactions(filteredTransactions);
  }, [filteredTransactions]);

  const categoryLookup = useMemo(() => {
    return getDashboardCategoryLookup(categories);
  }, [categories]);

  const sortedGoals = useMemo(() => {
    return getDashboardSortedGoals(goals);
  }, [goals]);

  const visibleGoals = useMemo(
    () => getDashboardVisibleGoals(sortedGoals),
    [sortedGoals],
  );

  const activeGoalsCount = useMemo(() => {
    return getDashboardActiveGoalsCount(goals);
  }, [goals]);

  const monthlySummary = useMemo(() => {
    return getDashboardMonthlySummary(filteredTransactions, totals);
  }, [filteredTransactions, totals]);

  const categoryLabelMap = useMemo(() => {
    const map = {};
    getInvestmentCategoryOptions(taxonomyNodes)
      .filter((opt) => opt.value !== "all")
      .forEach((opt) => {
        map[opt.value] = opt.label;
      });
    return map;
  }, [taxonomyNodes]);

  const investmentPeriodBounds = useMemo(() => {
    return getDashboardInvestmentPeriodBounds(
      periodMode,
      selectedYear,
      selectedMonth,
    );
  }, [periodMode, selectedYear, selectedMonth]);

  const investmentSummary = useMemo(() => {
    return getDashboardInvestmentSummary(
      investments,
      investmentPeriodBounds,
      categoryLabelMap,
    );
  }, [investments, investmentPeriodBounds, categoryLabelMap]);

  const handleAddTransaction = async (payload) => {
    try {
      const created = await saveTransaction({ payload });
      setTransactions((prev) => [
        {
          ...created,
          category:
            created?.category ||
            created?.categoryLabelSnapshot ||
            String(payload?.category || "").trim(),
        },
        ...prev,
      ]);
      setShowAddTx(false);
      setError("");
      pushNotification({
        type: "success",
        message: "Transaction added successfully",
      });
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
        setGoals((prev) =>
          prev.map((g) => (getGoalId(g) === updatedGoalId ? updated : g)),
        );
        pushNotification({
          type: "success",
          message: "Goal updated successfully",
        });
      } else {
        const created = await createGoal(payload);
        setGoals((prev) => [created, ...prev]);
        pushNotification({
          type: "success",
          message: "Goal added successfully",
        });
      }

      setShowGoalDrawer(false);
      setEditGoal(null);
      setError("");
      return null;
    } catch (error) {
      return getRuntimeErrorMessage(
        error,
        editGoal ? "Failed to update goal" : "Failed to create goal",
      );
    }
  };

  const handleUpdateGoal = (goal) => {
    setEditGoal(goal);
    setShowGoalDrawer(true);
  };

  const handleCreateCategory = async (payload) => {
    try {
      const created = await createCategory(payload);
      setCategories((prev) => [created, ...prev]);
      setShowAddCategory(false);
      setError("");
      pushNotification({
        type: "success",
        message: "Category added successfully",
      });
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
      const nextInvestment = buildInvestmentFromForm(
        formValues,
        null,
        taxonomyNodes,
      );
      await createInvestment(nextInvestment);
      await handleInvestmentsUpdated();
      setShowInvestments(false);
      setError("");
      pushNotification({
        type: "success",
        message: "Investment added successfully",
      });
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
      (account) =>
        (account.displayName || account.institutionName || account.name) ===
        accountName,
    );

    if (!matchedAccount) return;

    setEditAccount(matchedAccount);
    setShowAccountDrawer(true);
  };

  const handleAccountsUpdated = async () => {
    try {
      const nextAccounts = await getFinancialAccounts();
      setAccounts(Array.isArray(nextAccounts) ? nextAccounts : []);
      setError("");
      pushNotification({
        type: "success",
        message: editAccount
          ? "Account updated successfully"
          : "Account added successfully",
      });
    } catch (error) {
      pushNotification({
        type: "error",
        message: getRuntimeErrorMessage(error, "Failed to refresh accounts"),
      });
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
      const message =
        "Add at least one category before creating a transaction.";
      setError(message);
      pushNotification({ type: "warning", message });
      return;
    }

    if (accounts.length === 0) {
      const message =
        "Add at least one financial account before creating a transaction.";
      setError(message);
      pushNotification({ type: "warning", message });
      return;
    }

    setShowAddTx(true);
  };

  const handleOpenAddInvestmentDrawer = () => {
    if (accounts.length === 0) {
      const message =
        "Add at least one financial account before creating an investment.";
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
      {error && !hasOverlayOpen ? (
        <div className="rounded-2xl bg-red-100 p-3 text-red-700">{error}</div>
      ) : null}

      <DashboardKpiStrip
        balance={totals.balance}
        income={totals.income}
        expense={totals.expense}
        investmentSummary={investmentSummary}
        activeGoalsCount={activeGoalsCount}
      />

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <DashboardAccountsSection
          accountOverviewRows={accountOverviewRows}
          lifetimeBalance={lifetimeTotals.balance}
          periodBalance={totals.balance}
          selectedPeriodLabel={selectedPeriodLabel}
          onAddAccount={handleOpenAddAccount}
          onEditAccount={handleOpenEditAccount}
        />

        <DashboardInvestmentsSection
          selectedPeriodLabel={selectedPeriodLabel}
          investments={investments}
          investmentSummary={investmentSummary}
          onOpenInvestments={() => navigateTo("investments")}
          onAddInvestment={handleOpenAddInvestmentDrawer}
        />

        <DashboardRecentTransactionsSection
          recentTransactions={recentTransactions}
          categoryLookup={categoryLookup}
          onOpenTransactions={handleOpenTransactions}
          onAddTransaction={handleOpenAddTransactionDrawer}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <DashboardTopCategoriesSection
          items={categoryPieData.items}
          onViewAll={() => navigateTo("categories")}
        />

        <DashboardMonthlySummarySection
          summary={monthlySummary}
          selectedPeriodLabel={selectedPeriodLabel}
        />

        <DashboardGoalsOverviewSection
          goals={goals}
          visibleGoals={visibleGoals}
          activeGoalsCount={activeGoalsCount}
          onViewAll={() => navigateTo("goals")}
          onCreateGoal={() => {
            setEditGoal(null);
            setShowGoalDrawer(true);
          }}
          onEditGoal={handleUpdateGoal}
        />

        <DashboardQuickActionsSection
          categories={categories}
          goals={goals}
          transactions={transactions}
          investments={investments}
          onAddTransaction={handleOpenAddTransactionDrawer}
          onAddGoal={() => {
            setEditGoal(null);
            setShowGoalDrawer(true);
          }}
          onAddCategory={() => setShowAddCategory(true)}
          onAddInvestment={handleOpenAddInvestmentDrawer}
        />
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
