import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiEyeOutline, mdiPencilOutline } from "@mdi/js";
import { Alert, Box, IconButton, MenuItem, Select, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import AddTransactionModal from "../components/AddTransactionModal";
import Button from "../components/common/AppButton";
import { useHeaderAction } from "../hooks/useHeaderAction";
import { useViewportTableHeight } from "../hooks/useViewportTableHeight";
import { getTransactions } from "../api/transactions";
import { getCategories } from "../api/categories";
import { getGoals } from "../api/goals";
import {
  DataTable,
  EmptyState,
  FilterBar,
  KpiCard,
  SearchBar,
  SectionCard,
  StatusChip,
} from "../components/common";
import { ConfirmDialog } from "../components/dialogs";
import { TransactionViewDrawer } from "../components/drawers";
import { useDrawerStore } from "../store/drawerStore";
import { useDialogStore } from "../store/dialogStore";
import { useNotificationStore } from "../store/notificationStore";
import { matchesPageDateFilter, usePageDateFilterStore } from "../store/pageDateFilterStore";
import { closeDialog, closeDrawer, openDialog, openDrawer } from "../services/navigation";
import { executeActionContract } from "../utils/actionContract";
import {
  buildDeleteTransactionAction,
  buildSaveTransactionAction,
} from "../modules/transactions/actions";

const getInitialDateFilter = (prefillFilter) => {
  void prefillFilter;
  return { dateRange: [null, null], dateRangeShortcut: "all" };
};

const getTransactionId = (tx) => tx._id || tx.id;
const getGoalId = (goal) => goal._id || goal.id;

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;

const matchesTransactionTableDrilldown = (tx, filterKey) => {
  if (filterKey === "all") return true;
  if (filterKey === "linked") return Boolean(tx.goalId);
  return tx.type === filterKey;
};

export default function Transactions({ prefetchedTransactions = [], prefillFilter = null }) {
  const hasPrefetched = Array.isArray(prefetchedTransactions) && prefetchedTransactions.length > 0;
  const transactionTableRef = useRef(null);

  const [transactions, setTransactions] = useState(hasPrefetched ? prefetchedTransactions : []);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(!hasPrefetched);
  const [error, setError] = useState("");
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const drawerOpen = useDrawerStore((state) => state.open);
  const drawerType = useDrawerStore((state) => state.type);
  const drawerMode = useDrawerStore((state) => state.mode);
  const drawerEntityId = useDrawerStore((state) => state.entityId);

  const dialogOpen = useDialogStore((state) => state.open);
  const dialogType = useDialogStore((state) => state.type);
  const dialogPayload = useDialogStore((state) => state.payload);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tableDrilldownFilter, setTableDrilldownFilter] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [dateRangeShortcut, setDateRangeShortcut] = useState("all");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const periodMode = usePageDateFilterStore((state) => state.mode);
  const selectedYear = usePageDateFilterStore((state) => state.selectedYear);
  const selectedMonth = usePageDateFilterStore((state) => state.selectedMonth);

  useEffect(() => {
    const initialDateFilter = getInitialDateFilter(prefillFilter);
    setDateRange(initialDateFilter.dateRange);
    setDateRangeShortcut(initialDateFilter.dateRangeShortcut);
  }, [prefillFilter]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setTableDrilldownFilter("all");

    const initialDateFilter = getInitialDateFilter(prefillFilter);
    setDateRange(initialDateFilter.dateRange);
    setDateRangeShortcut(initialDateFilter.dateRangeShortcut);
  }, [prefillFilter]);

  const applyDateRangeShortcut = (shortcut) => {
    setDateRangeShortcut(shortcut);

    if (shortcut === "all") {
      setDateRange([null, null]);
      return;
    }

    if (shortcut === "custom") return;

    const now = dayjs();
    if (shortcut === "last7") {
      setDateRange([now.subtract(6, "day"), now]);
      return;
    }
    if (shortcut === "last30") {
      setDateRange([now.subtract(29, "day"), now]);
      return;
    }
    if (shortcut === "thisMonth") {
      setDateRange([now.startOf("month"), now.endOf("month")]);
      return;
    }
    if (shortcut === "thisYear") {
      setDateRange([now.startOf("year"), now.endOf("year")]);
    }
  };

  const categoryOptions = useMemo(
    () =>
      [
        ...new Set(
          categories
            .filter((category) => category?.type === "income" || category?.type === "expense")
            .map((category) => category.name)
        ),
      ],
    [categories]
  );

  const goalNameById = useMemo(() => {
    return goals.reduce((acc, goal) => {
      acc[getGoalId(goal)] = goal.name || "Untitled Goal";
      return acc;
    }, {});
  }, [goals]);

  const goalOptions = useMemo(
    () => goals.map((goal) => ({ id: getGoalId(goal), name: goal.name || "Untitled Goal" })),
    [goals]
  );

  const sortedTransactions = useMemo(() => {
    const pageFilteredTransactions = transactions.filter((tx) => {
      const transactionDate = new Date(tx.date || tx.createdAt || Date.now());
      return matchesPageDateFilter(transactionDate, periodMode, selectedYear, selectedMonth);
    });

    return [...pageFilteredTransactions].sort(
      (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
  }, [transactions, periodMode, selectedYear, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    const [from, to] = dateRange;

    return sortedTransactions.filter((tx) => {
      const date = new Date(tx.date || tx.createdAt || Date.now());
      const txDate = dayjs(date);
      const goalName = tx.goalId ? goalNameById[tx.goalId] || "Linked goal removed" : "";

      if (from && txDate.isBefore(from.startOf("day"))) return false;
      if (to && txDate.isAfter(to.endOf("day"))) return false;

      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;

      const haystack = `${tx.category || ""} ${tx.type || ""} ${tx.source || ""} ${goalName} ${tx.notes || ""}`.toLowerCase();
      if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;

      return true;
    });
  }, [
    sortedTransactions,
    typeFilter,
    categoryFilter,
    search,
    dateRange,
    goalNameById,
  ]);

  const transactionInsights = useMemo(() => {
    const summary = filteredTransactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount || 0);
        const isExpense = tx.type === "expense";

        if (isExpense) {
          acc.totalExpense += amount;
        } else {
          acc.totalIncome += amount;
        }

        acc.transactionCount += 1;

        return acc;
      },
      { totalIncome: 0, totalExpense: 0, transactionCount: 0 }
    );

    return {
      ...summary,
      net: summary.totalIncome - summary.totalExpense,
    };
  }, [filteredTransactions]);

  const focusTransactionTable = useCallback(() => {
    requestAnimationFrame(() => {
      transactionTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleTransactionTableDrilldown = useCallback((filterKey = "all") => {
    setTableDrilldownFilter(filterKey);
    focusTransactionTable();
  }, [focusTransactionTable]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [search, typeFilter, categoryFilter, tableDrilldownFilter, dateRange]);

  const tableTransactions = useMemo(
    () => filteredTransactions.filter((tx) => matchesTransactionTableDrilldown(tx, tableDrilldownFilter)),
    [filteredTransactions, tableDrilldownFilter]
  );

  const rows = useMemo(
    () =>
      tableTransactions.map((tx) => {
        const txDate = new Date(tx.date || tx.createdAt || Date.now());
        const txId = getTransactionId(tx);

        return {
          id: txId,
          tx,
          date: txDate,
          dateLabel: txDate.toLocaleDateString(),
          category: tx.category || "Uncategorized",
          source: tx.source || "Unknown source",
          type: tx.type || "unknown",
          amount: Number(tx.amount || 0),
          notes: tx.notes || "",
        };
      }),
    [tableTransactions]
  );
  const tableHeight = useViewportTableHeight(transactionTableRef, {
    bottomOffset: 50,
    minHeight: 360,
    defaultHeight: 620,
    deps: [loading, error, rows.length],
  });

  const selectedTransaction = useMemo(() => {
    if (drawerType !== "transaction" || !drawerEntityId) return null;
    return transactions.find((tx) => getTransactionId(tx) === drawerEntityId) || null;
  }, [transactions, drawerType, drawerEntityId]);

  const selectedTransactionGoalName = selectedTransaction?.goalId
    ? goalNameById[selectedTransaction.goalId] || "Linked goal removed"
    : "No linked goal";

  const isTransactionFormDrawerOpen =
    drawerOpen &&
    drawerType === "transaction" &&
    (drawerMode === "create" || drawerMode === "edit");

  const isTransactionViewDrawerOpen =
    drawerOpen && drawerType === "transaction" && drawerMode === "view";

  const createTransactionInitialValues = useMemo(() => {
    if (!(drawerOpen && drawerType === "transaction" && drawerMode === "create" && drawerEntityId)) {
      return null;
    }

    const relatedGoal = goals.find((goal) => (goal._id || goal.id) === drawerEntityId);
    return {
      goalId: drawerEntityId,
      type: "income",
      category: relatedGoal?.category || "",
    };
  }, [drawerOpen, drawerType, drawerMode, drawerEntityId, goals]);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [tx, cs, gs] = await Promise.all([
        getTransactions(),
        getCategories(),
        getGoals(),
      ]);
      setTransactions(tx);
      setCategories(cs);
      setGoals(gs);
      setError(""); // Clear error on success
    } catch (e) {
      setError("Failed to load transactions");
      pushNotification({ type: "error", message: "Failed to load transactions" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    loadData(hasPrefetched);
  }, [loadData, hasPrefetched]);

  const handleSubmitTransaction = useCallback(async (payload) => {
    const action = buildSaveTransactionAction({
      payload,
      selectedTransaction,
      getTransactionId,
      onSuccess: async () => {
        closeDrawer();
        setError("");
        await loadData();
      },
    });

    const ok = await executeActionContract(action, { notify: pushNotification });
    if (!ok && action.feedback?.error) {
      setError(action.feedback.error);
    }
  }, [selectedTransaction, loadData, pushNotification]);

  const handleDelete = useCallback(async () => {
    const payload = dialogPayload && typeof dialogPayload === "object" ? dialogPayload : null;
    const targetId = payload && payload.id ? payload.id : null;
    const action = buildDeleteTransactionAction({
      targetId,
      onSuccess: async () => {
        closeDialog();
        setError("");
        await loadData();
      },
    });

    const ok = await executeActionContract(action, { notify: pushNotification });
    if (!ok && action.feedback?.error) {
      setError(action.feedback.error);
    }
  }, [dialogPayload, loadData, pushNotification]);

  const isTransactionDeleteDialogOpen =
    dialogOpen &&
    dialogType === "confirmDelete" &&
    dialogPayload &&
    typeof dialogPayload === "object" &&
    dialogPayload.entity === "transaction";

  const openEditDrawer = useCallback((transaction) => {
    openDrawer({
      type: "transaction",
      mode: "edit",
      entityId: getTransactionId(transaction),
      step: "form",
    });
  }, []);

  const openViewDrawer = useCallback((transaction) => {
    openDrawer({
      type: "transaction",
      mode: "view",
      entityId: getTransactionId(transaction),
      step: "overview",
    });
  }, []);

  const columns = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        flex: 0.9,
        minWidth: 120,
        valueGetter: (_value, row) => row.date,
        valueFormatter: (value) => new Date(value).toLocaleDateString(),
      },
      {
        field: "category",
        headerName: "Category",
        flex: 1.2,
        minWidth: 150,
      },
      {
        field: "source",
        headerName: "Bank / Source",
        flex: 1.15,
        minWidth: 170,
      },
      {
        field: "type",
        headerName: "Type",
        flex: 0.9,
        minWidth: 120,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <StatusChip label={params.value} tone={params.value === "expense" ? "error" : "success"} />
          </Box>
        ),
      },
      {
        field: "amount",
        headerName: "Amount",
        type: "number",
        flex: 1,
        minWidth: 140,
        renderCell: (params) => {
          const isExpense = params.row.type === "expense";
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                width: "100%",
                height: "100%",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: isExpense ? "error.main" : "success.main", fontWeight: 600, lineHeight: 1.2 }}
              >
                {isExpense ? "-" : "+"} {formatCurrency(params.value)}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1.6,
        minWidth: 200,
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        flex: 0.8,
        minWidth: 170,
        renderCell: (params) => {
          const transactionName = params.row.category || "transaction";

          return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
            <IconButton
              size="small"
              variant="contained"
              disableElevation
              title={`View ${transactionName}`}
              aria-label={`View ${transactionName}`}
              onClick={() => openViewDrawer(params.row.tx)}
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiEyeOutline} size={0.8} />
            </IconButton>
            <IconButton
              size="small"
              variant="contained"
              disableElevation
              title={`Edit ${transactionName}`}
              aria-label={`Edit ${transactionName}`}
              onClick={() => openEditDrawer(params.row.tx)}
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiPencilOutline} size={0.8} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              variant="contained"
              disableElevation
              title={`Delete ${transactionName}`}
              aria-label={`Delete ${transactionName}`}
              onClick={() =>
                openDialog("confirmDelete", {
                  entity: "transaction",
                  id: params.row.id,
                })
              }
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiDeleteOutline} size={0.8} />
            </IconButton>
          </Box>
        );
        },
      },
    ],
    [openEditDrawer, openViewDrawer]
  );

  const handleOpenAdd = useCallback(() => {
    if (categories.length === 0) {
      setError("Please add a category before adding a transaction.");
      pushNotification({ type: "warning", message: "Please add a category before adding a transaction." });
      return;
    }
    openDrawer({ type: "transaction", mode: "create", step: "form" });
  }, [categories, pushNotification]);

  useHeaderAction("transactions", {
    label: "Transaction",
    onClick: handleOpenAdd,
    disabled: loading,
  });

  return (
    <main className="flex-1 w-full">
      <div className="w-full">
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {!loading && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <KpiCard
              title="Income"
              value={formatCurrency(transactionInsights.totalIncome)}
              delta={`${filteredTransactions.length} transactions in view`}
              deltaTone="positive"
              onClick={() => handleTransactionTableDrilldown("income")}
            />
            <KpiCard
              title="Expenses"
              value={formatCurrency(transactionInsights.totalExpense)}
              delta={`${categoryOptions.length} categories available`}
              deltaTone={transactionInsights.totalExpense > 0 ? "negative" : "neutral"}
              onClick={() => handleTransactionTableDrilldown("expense")}
            />
            <KpiCard
              title="Net Cash Flow"
              value={formatCurrency(transactionInsights.net)}
              delta={transactionInsights.net >= 0 ? "Positive balance" : "Negative balance"}
              deltaTone={transactionInsights.net >= 0 ? "positive" : "negative"}
              onClick={() => handleTransactionTableDrilldown("all")}
            />
            <KpiCard
              title="Transactions"
              value={transactionInsights.transactionCount}
              delta={`${goalOptions.length} goals available`}
              deltaTone="neutral"
              onClick={() => handleTransactionTableDrilldown("all")}
            />
          </Box>
        )}

      {!loading && (
        <FilterBar onReset={handleResetFilters}>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search category/type/bank/goal/notes"
            />

            {/* <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} size="small" fullWidth>
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </Select> */}

            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} size="small" fullWidth>
              <MenuItem value="all">All Categories</MenuItem>
              {categoryOptions.map((name) => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>

            <Select
              value={dateRangeShortcut}
              onChange={(e) => applyDateRangeShortcut(e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="all">Date Range: All Time</MenuItem>
              <MenuItem value="last7">Date Range: Last 7 Days</MenuItem>
              <MenuItem value="last30">Date Range: Last 30 Days</MenuItem>
              <MenuItem value="thisMonth">Date Range: This Month</MenuItem>
              <MenuItem value="thisYear">Date Range: This Year</MenuItem>
              <MenuItem value="custom">Date Range: Custom</MenuItem>
            </Select>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From"
                value={dateRange[0]}
                onChange={(value) => {
                  setDateRange([value, dateRange[1]]);
                  setDateRangeShortcut("custom");
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="To"
                value={dateRange[1]}
                onChange={(value) => {
                  setDateRange([dateRange[0], value]);
                  setDateRangeShortcut("custom");
                }}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
        </FilterBar>
      )}

      <Box ref={transactionTableRef}>
      <SectionCard>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <>
          {rows.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description="Adjust your filters or add a transaction to get started."
              actionLabel="Add Transaction"
              onAction={handleOpenAdd}
            />
          ) : (
              <DataTable
                rows={rows}
                columns={columns}
                pagination
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                rowBufferPx={400}
                columnBufferPx={300}
                containerSx={{ height: tableHeight }}
                initialState={{
                  sorting: { sortModel: [{ field: "date", sort: "desc" }] },
                }}
              />
          )}
          </>
        )}
      </SectionCard>
      </Box>

        <AddTransactionModal
          open={Boolean(isTransactionFormDrawerOpen)}
          onClose={() => {
            closeDrawer();
          }}
          onSubmit={handleSubmitTransaction}
          initialValues={selectedTransaction || createTransactionInitialValues}
          title={selectedTransaction ? "Edit Transaction" : "Add Transaction"}
          submitLabel={selectedTransaction ? "Update" : "Add"}
          categories={categories}
          goals={goals}
        />

        <TransactionViewDrawer
          open={Boolean(isTransactionViewDrawerOpen)}
          onClose={closeDrawer}
          transaction={selectedTransaction}
          goalName={selectedTransactionGoalName}
          onEdit={(transaction) => {
            openEditDrawer(transaction);
          }}
          onDelete={(transaction) => {
            closeDrawer();
            openDialog("confirmDelete", {
              entity: "transaction",
              id: getTransactionId(transaction),
            });
          }}
        />

        <ConfirmDialog
          open={Boolean(isTransactionDeleteDialogOpen)}
          title="Delete Transaction"
          description="Are you sure you want to delete this transaction? This action cannot be undone."
          confirmLabel="Delete"
          confirmColor="error"
          onCancel={closeDialog}
          onConfirm={handleDelete}
        />
      </div>
    </main>
  );
}
