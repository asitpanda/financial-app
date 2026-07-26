import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiEyeOutline, mdiPencilOutline } from "@mdi/js";
import { Alert, Box, IconButton, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import TransactionsAddEditDrawer from "./components/TransactionsAddEditDrawer";
import { useHeaderAction } from "../../hooks/useHeaderAction";
import { useViewportTableHeight } from "../../hooks/useViewportTableHeight";
import {
  useRemoveTransaction,
  useSaveTransaction,
  useTransactionPageData,
} from "./useTransactions";
import {
  DataTable,
  EmptyState,
  FilterBar,
  KpiCard,
  LabeledDateField,
  LabeledSelectField,
  SearchBar,
  SectionCard,
  StatusChip,
} from "../../components/common";
import { ConfirmDialog } from "../../components/dialogs";
import { TransactionViewDrawer } from "./components/TransactionViewDrawer";
import { useDrawerStore } from "../../store/drawerStore";
import { useDialogStore } from "../../store/dialogStore";
import { useNotificationStore } from "../../store/notificationStore";
import {
  matchesPageDateFilter,
  usePageDateFilterStore,
} from "../../store/pageDateFilterStore";
import {
  closeDialog,
  closeDrawer,
  openDialog,
  openDrawer,
} from "../../services/navigation";
import {
  getFilteredTransactions,
  getSortedTransactions,
  getTransactionInsights,
  getTransactionRows,
} from "./transactions.selectors";
import { GridColDef } from "@mui/x-data-grid/models";
import type {
  TransactionRecord,
  TransactionSavePayload,
} from "./transaction.types";

type DateRangeShortcut =
  | "all"
  | "custom"
  | "last7"
  | "last30"
  | "thisMonth"
  | "thisYear";

type DrilldownFilter = "all" | "linked" | "income" | "expense";

interface TransactionDialogPayload {
  entity?: string;
  id?: string | number;
}

interface TransactionsProps {
  prefetchedTransactions?: TransactionRecord[];
  prefillFilter?: unknown;
}

interface DateFilterState {
  dateRange: [Dayjs | null, Dayjs | null];
  dateRangeShortcut: DateRangeShortcut;
}

interface TransactionTableRow {
  id: string;
  tx: TransactionRecord;
  date: Date;
  dateLabel: string;
  category: string;
  source: string;
  type: string;
  amount: number;
  notes: string;
}

const getInitialDateFilter = (prefillFilter: unknown): DateFilterState => {
  void prefillFilter;
  return { dateRange: [null, null], dateRangeShortcut: "all" };
};

const getGoalId = (goal: { _id?: string; id?: string }) =>
  String(goal._id || goal.id || "");

const getTransactionId = (tx: TransactionRecord): string =>
  String(tx._id || tx.id);

const formatCurrency = (value: number | string | null | undefined) =>
  `₹${Number(value || 0).toLocaleString()}`;

const matchesTransactionTableDrilldown = (
  tx: TransactionRecord,
  filterKey: DrilldownFilter,
) => {
  if (filterKey === "all") return true;
  if (filterKey === "linked") return Boolean(tx.goalId);
  return tx.type === filterKey;
};

export default function Transactions({
  prefetchedTransactions = [],
  prefillFilter = null,
}: TransactionsProps) {
  const hasPrefetched =
    Array.isArray(prefetchedTransactions) && prefetchedTransactions.length > 0;
  const transactionTableRef = useRef<HTMLDivElement | null>(null);
  const [uiError, setUiError] = useState<string>("");
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );
  const saveTransactionMutation = useSaveTransaction();
  const deleteTransactionMutation = useRemoveTransaction();
  const {
    transactions,
    categories,
    goals,
    accounts,
    loading,
    error: pageDataError,
    reload,
  } = useTransactionPageData(hasPrefetched, prefetchedTransactions);
  const errorMessage =
    uiError || (pageDataError ? "Failed to load transactions" : "");

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
  const [tableDrilldownFilter, setTableDrilldownFilter] =
    useState<DrilldownFilter>("all");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [dateRangeShortcut, setDateRangeShortcut] =
    useState<DateRangeShortcut>("all");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
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

  const applyDateRangeShortcut = (shortcut: DateRangeShortcut) => {
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
    () => [
      ...new Set(
        categories
          .filter(
            (category) =>
              category?.type === "income" || category?.type === "expense",
          )
          .map((category) => category.name),
      ),
    ],
    [categories],
  );

  const goalNameById = useMemo(() => {
    return goals.reduce((acc: Record<string, string>, goal) => {
      acc[getGoalId(goal)] = goal.name || "Untitled Goal";
      return acc;
    }, {});
  }, [goals]);

  const goalOptions = useMemo(
    () =>
      goals.map((goal) => ({
        id: getGoalId(goal),
        name: goal.name || "Untitled Goal",
      })),
    [goals],
  );

  const accountNameById = useMemo(() => {
    return accounts.reduce((acc: Record<number, string>, account) => {
      acc[Number(account.id)] =
        account.displayName || account.institutionName || account.name || "";
      return acc;
    }, {});
  }, [accounts]);

  const sortedTransactions = useMemo(() => {
    return getSortedTransactions(
      transactions,
      periodMode,
      selectedYear,
      selectedMonth,
      matchesPageDateFilter,
    );
  }, [transactions, periodMode, selectedYear, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    return getFilteredTransactions(sortedTransactions, {
      dateRange,
      typeFilter,
      categoryFilter,
      search,
      goalNameById,
      accountNameById,
    });
  }, [
    sortedTransactions,
    typeFilter,
    categoryFilter,
    search,
    dateRange,
    goalNameById,
    accountNameById,
  ]);

  const transactionInsights = useMemo(() => {
    return getTransactionInsights(filteredTransactions);
  }, [filteredTransactions]);

  const focusTransactionTable = useCallback(() => {
    requestAnimationFrame(() => {
      transactionTableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const handleTransactionTableDrilldown = useCallback(
    (filterKey: DrilldownFilter = "all") => {
      setTableDrilldownFilter(filterKey);
      focusTransactionTable();
    },
    [focusTransactionTable],
  );

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [search, typeFilter, categoryFilter, tableDrilldownFilter, dateRange]);

  const tableTransactions = useMemo(
    () =>
      filteredTransactions.filter((tx) =>
        matchesTransactionTableDrilldown(tx, tableDrilldownFilter),
      ),
    [filteredTransactions, tableDrilldownFilter],
  );

  const rows = useMemo(
    () =>
      getTransactionRows(tableTransactions, accountNameById, getTransactionId),
    [tableTransactions, accountNameById],
  ) as TransactionTableRow[];
  const tableHeight = useViewportTableHeight(transactionTableRef, {
    bottomOffset: 50,
    minHeight: 360,
    defaultHeight: 620,
    deps: [loading, errorMessage, rows.length],
  });

  const selectedTransaction = useMemo(() => {
    if (drawerType !== "transaction" || !drawerEntityId) return null;
    return (
      transactions.find((tx) => getTransactionId(tx) === drawerEntityId) || null
    );
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
    if (
      !(
        drawerOpen &&
        drawerType === "transaction" &&
        drawerMode === "create" &&
        drawerEntityId
      )
    ) {
      return null;
    }

    const relatedGoal = goals.find(
      (goal) => (goal._id || goal.id) === drawerEntityId,
    );
    return {
      goalId: drawerEntityId,
      type: "income" as const,
      category: relatedGoal?.category || "",
    };
  }, [drawerOpen, drawerType, drawerMode, drawerEntityId, goals]);

  const handleSubmitTransaction = useCallback(
    async (payload: TransactionSavePayload) => {
      try {
        await saveTransactionMutation.mutateAsync({
          payload,
          selectedTransaction,
        });
        closeDrawer();
        setUiError("");
        pushNotification({
          type: "success",
          message: selectedTransaction
            ? "Transaction updated successfully"
            : "Transaction added successfully",
        });
        await reload();
        return null;
      } catch (error: unknown) {
        const runtimeError = error as {
          response?: { data?: { message?: unknown } };
          message?: unknown;
        };
        const runtimeMessage =
          runtimeError?.response?.data?.message ||
          runtimeError?.message ||
          (selectedTransaction
            ? "Failed to update transaction"
            : "Failed to add transaction");
        const message = Array.isArray(runtimeMessage)
          ? String(runtimeMessage[0])
          : String(runtimeMessage);

        pushNotification({ type: "error", message });
        return message;
      }
    },
    [selectedTransaction, saveTransactionMutation, reload, pushNotification],
  );

  const handleDelete = useCallback(async () => {
    const payload =
      dialogPayload && typeof dialogPayload === "object"
        ? (dialogPayload as TransactionDialogPayload)
        : null;
    const targetId = payload && payload.id ? payload.id : null;
    if (!targetId) {
      pushNotification({
        type: "error",
        message: "Failed to delete transaction",
      });
      return;
    }

    try {
      await deleteTransactionMutation.mutateAsync(String(targetId));
      closeDialog();
      setUiError("");
      pushNotification({
        type: "success",
        message: "Transaction deleted successfully",
      });
      await reload();
    } catch (error: unknown) {
      const runtimeError = error as {
        response?: { data?: { message?: unknown } };
        message?: unknown;
      };
      const runtimeMessage =
        runtimeError?.response?.data?.message ||
        runtimeError?.message ||
        "Failed to delete transaction";
      const message = Array.isArray(runtimeMessage)
        ? String(runtimeMessage[0])
        : String(runtimeMessage);
      pushNotification({ type: "error", message });
    }
  }, [dialogPayload, deleteTransactionMutation, reload, pushNotification]);

  const isTransactionDeleteDialogOpen =
    dialogOpen &&
    dialogType === "confirmDelete" &&
    dialogPayload &&
    typeof dialogPayload === "object" &&
    (dialogPayload as TransactionDialogPayload).entity === "transaction";

  const openEditDrawer = useCallback((transaction: TransactionRecord) => {
    openDrawer({
      type: "transaction",
      mode: "edit",
      entityId: getTransactionId(transaction),
      step: "form",
    });
  }, []);

  const openViewDrawer = useCallback((transaction: TransactionRecord) => {
    openDrawer({
      type: "transaction",
      mode: "view",
      entityId: getTransactionId(transaction),
      step: "overview",
    });
  }, []);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        flex: 0.9,
        minWidth: 120,
        valueGetter: (_value, row) => (row as TransactionTableRow).date,
        valueFormatter: (value) => new Date(String(value)).toLocaleDateString(),
      },
      { field: "category", headerName: "Category", flex: 1.2, minWidth: 150 },
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
            <StatusChip
              label={String(params.value)}
              tone={params.value === "expense" ? "error" : "success"}
            />
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
          const row = params.row as TransactionTableRow;
          const isExpense = row.type === "expense";
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
                sx={{
                  color: isExpense ? "error.main" : "success.main",
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {isExpense ? "-" : "+"} {formatCurrency(params.value as number)}
              </Typography>
            </Box>
          );
        },
      },
      { field: "notes", headerName: "Notes", flex: 1.6, minWidth: 200 },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        flex: 0.8,
        minWidth: 170,
        renderCell: (params) => {
          const row = params.row as TransactionTableRow;
          const transactionName = row.category || "transaction";

          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                height: "100%",
              }}
            >
              <IconButton
                size="small"
                title={`View ${transactionName}`}
                aria-label={`View ${transactionName}`}
                onClick={() => openViewDrawer(row.tx)}
                sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
              >
                <Icon path={mdiEyeOutline} size={0.8} />
              </IconButton>
              <IconButton
                size="small"
                title={`Edit ${transactionName}`}
                aria-label={`Edit ${transactionName}`}
                onClick={() => openEditDrawer(row.tx)}
                sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
              >
                <Icon path={mdiPencilOutline} size={0.8} />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                title={`Delete ${transactionName}`}
                aria-label={`Delete ${transactionName}`}
                onClick={() =>
                  openDialog("confirmDelete", {
                    entity: "transaction",
                    id: row.id,
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
    [openEditDrawer, openViewDrawer],
  );

  const handleOpenAdd = useCallback(() => {
    if (categories.length === 0) {
      setUiError("Please add a category before adding a transaction.");
      pushNotification({
        type: "warning",
        message: "Please add a category before adding a transaction.",
      });
      return;
    }

    if (accounts.length === 0) {
      setUiError("Please add a financial account before adding a transaction.");
      pushNotification({
        type: "warning",
        message: "Please add a financial account before adding a transaction.",
      });
      return;
    }

    openDrawer({ type: "transaction", mode: "create", step: "form" });
  }, [accounts.length, categories.length, pushNotification]);
  const hasTransactionFilters =
    Boolean(search.trim()) ||
    typeFilter !== "all" ||
    categoryFilter !== "all" ||
    tableDrilldownFilter !== "all" ||
    dateRangeShortcut !== "all" ||
    Boolean(dateRange[0]) ||
    Boolean(dateRange[1]);
  const isFirstTransactionSetup =
    sortedTransactions.length === 0 && !hasTransactionFilters;
  const transactionTableEmptyState = isFirstTransactionSetup
    ? {
        title: "No transactions yet",
        description:
          "Add your first transaction to start tracking cash flow and category trends.",
        actionLabel: "Add Transaction",
        onAction: handleOpenAdd,
      }
    : {
        title: "No transactions found",
        description:
          "Adjust your filters to widen results, or add a new transaction.",
        actionLabel: "Add Transaction",
        onAction: handleOpenAdd,
      };

  useHeaderAction("transactions", {
    label: "Transaction",
    onClick: handleOpenAdd,
    disabled: loading || categories.length === 0 || accounts.length === 0,
  });

  return (
    <main className="flex-1 w-full">
      <div className="w-full">
        {errorMessage && !drawerOpen && !dialogOpen ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}

        {!loading && isFirstTransactionSetup ? (
          <Box
            sx={{
              minHeight: {
                xs: "calc(100dvh - 240px)",
                md: "calc(100dvh - 220px)",
              },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              backgroundColor: "background.paper",
              px: 2,
              py: 3,
            }}
          >
            <EmptyState
              title="No transactions yet"
              description="Add your first transaction to start tracking cash flow and category trends."
              actionLabel="Add Transaction"
              onAction={handleOpenAdd}
            />
          </Box>
        ) : null}

        {!loading && !isFirstTransactionSetup && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
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
              deltaTone={
                transactionInsights.totalExpense > 0 ? "negative" : "neutral"
              }
              onClick={() => handleTransactionTableDrilldown("expense")}
            />
            <KpiCard
              title="Net Cash Flow"
              value={formatCurrency(transactionInsights.net)}
              delta={
                transactionInsights.net >= 0
                  ? "Positive balance"
                  : "Negative balance"
              }
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

        {!loading && !isFirstTransactionSetup && (
          <FilterBar onReset={handleResetFilters}>
            <SearchBar
              className="self-center"
              value={search}
              onChange={setSearch}
              placeholder="Search category/type/bank/goal/notes"
            />

            <LabeledSelectField
              labelText="All Categories"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter((e.target as HTMLInputElement).value)
              }
              options={categoryOptions.map((name) => ({
                value: name,
                label: name,
              }))}
              size="small"
              fullWidth
            />

            <LabeledSelectField
              labelText="Date Range"
              value={dateRangeShortcut}
              onChange={(e) =>
                applyDateRangeShortcut(
                  (e.target as HTMLInputElement).value as DateRangeShortcut,
                )
              }
              options={[
                { value: "all", label: "All Time" },
                { value: "last7", label: "Last 7 Days" },
                { value: "last30", label: "Last 30 Days" },
                { value: "thisMonth", label: "This Month" },
                { value: "thisYear", label: "This Year" },
                { value: "custom", label: "Custom Range" },
              ]}
              size="small"
              fullWidth
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <LabeledDateField
                labelText="From"
                value={dateRange[0]}
                onChange={(value) => {
                  setDateRange([value, dateRange[1]]);
                  setDateRangeShortcut("custom");
                }}
              />
            </LocalizationProvider>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <LabeledDateField
                labelText="To"
                value={dateRange[1]}
                onChange={(value) => {
                  setDateRange([dateRange[0], value]);
                  setDateRangeShortcut("custom");
                }}
              />
            </LocalizationProvider>
          </FilterBar>
        )}

        {!isFirstTransactionSetup ? (
          <Box ref={transactionTableRef}>
            <SectionCard
              empty={!loading && rows.length === 0}
              emptyState={transactionTableEmptyState}
            >
              {loading ? (
                <div className="text-center py-8">Loading...</div>
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
            </SectionCard>
          </Box>
        ) : null}

        <TransactionsAddEditDrawer
          open={Boolean(isTransactionFormDrawerOpen)}
          onClose={closeDrawer}
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
