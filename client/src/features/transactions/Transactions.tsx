import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import {
  mdiDeleteOutline,
  mdiEyeOutline,
  mdiPencilOutline,
  mdiSwapHorizontal,
  mdiTrendingUp,
} from "@mdi/js";
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
  closeDialog,
  closeDrawer,
  openDialog,
  openDrawer,
} from "../../services/navigation";
import {
  getTransactionRows,
} from "./transactions.selectors";
import type { GridColDef, GridSortModel } from "@mui/x-data-grid/models";
import type {
  TransactionRecord,
  TransactionListRow,
  TransactionSavePayload,
} from "./transaction.types";

type DateRangeShortcut =
  | "all"
  | "custom"
  | "last7"
  | "last30"
  | "lastMonth"
  | "thisMonth"
  | "thisYear";

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

type PrefillFilter = {
  mode?: "monthly" | "yearly";
  fiscalYearStart?: number;
  month?: number;
};

interface TransactionTableRow {
  id: string;
  transactionId: string;
  tx: TransactionRecord;
  date: Date;
  dateLabel: string;
  category: string;
  source: string;
  type: string;
  amount: number;
  notes: string;
  investment: string;
  investmentEventType: string;
  debitAmount: number | null;
  creditAmount: number | null;
  balanceAfter: number | null;
}

const resolveFiscalMonthYear = (fiscalYearStart: number, monthIndex: number) => {
  const year = monthIndex >= 3 ? fiscalYearStart : fiscalYearStart + 1;
  return { year, month: monthIndex };
};

const getInitialDateFilter = (prefillFilter: unknown): DateFilterState => {
  if (prefillFilter && typeof prefillFilter === "object") {
    const { mode, fiscalYearStart, month } = prefillFilter as PrefillFilter;

    if (mode === "monthly" && Number.isInteger(fiscalYearStart) && Number.isInteger(month)) {
      const resolved = resolveFiscalMonthYear(Number(fiscalYearStart), Number(month));
      const start = dayjs(new Date(resolved.year, resolved.month, 1)).startOf("month");
      const end = start.endOf("month");
      return { dateRange: [start, end], dateRangeShortcut: "custom" };
    }

    if (mode === "yearly" && Number.isInteger(fiscalYearStart)) {
      const start = dayjs(new Date(Number(fiscalYearStart), 3, 1)).startOf("day");
      const end = start.add(1, "year").subtract(1, "day").endOf("day");
      return { dateRange: [start, end], dateRangeShortcut: "custom" };
    }
  }

  return { dateRange: [null, null], dateRangeShortcut: "all" };
};

const getGoalId = (goal: { _id?: string; id?: string }) =>
  String(goal._id || goal.id || "");

const getTransactionId = (tx: TransactionRecord): string =>
  String(tx._id || tx.id);

import { useCurrencyFormatter } from "../../utils/currency";
import { useDateFormatter } from "../../utils/date";

export default function Transactions({
  prefetchedTransactions = [],
  prefillFilter = null,
}: TransactionsProps) {
  const formatCurrency = useCurrencyFormatter();
  const formatDate = useDateFormatter();
  const hasPrefetched =
    Array.isArray(prefetchedTransactions) && prefetchedTransactions.length > 0;
  const transactionTableRef = useRef<HTMLDivElement | null>(null);
  const [uiError, setUiError] = useState<string>("");
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );
  const saveTransactionMutation = useSaveTransaction();
  const deleteTransactionMutation = useRemoveTransaction();

  const drawerOpen = useDrawerStore((state) => state.open);
  const drawerType = useDrawerStore((state) => state.type);
  const drawerMode = useDrawerStore((state) => state.mode);
  const drawerEntityId = useDrawerStore((state) => state.entityId);

  const dialogOpen = useDialogStore((state) => state.open);
  const dialogType = useDialogStore((state) => state.type);
  const dialogPayload = useDialogStore((state) => state.payload);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
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
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "date", sort: "desc" },
  ]);
  const resetPage = useCallback(() => {
    setPaginationModel((previous) => ({ ...previous, page: 0 }));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const initialDateFilter = getInitialDateFilter(prefillFilter);
    setDateRange(initialDateFilter.dateRange);
    setDateRangeShortcut(initialDateFilter.dateRangeShortcut);
    resetPage();
  }, [prefillFilter, resetPage]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setAccountFilter("all");
    resetPage();

    const initialDateFilter = getInitialDateFilter(prefillFilter);
    setDateRange(initialDateFilter.dateRange);
    setDateRangeShortcut(initialDateFilter.dateRangeShortcut);
  }, [prefillFilter, resetPage]);

  const applyDateRangeShortcut = (shortcut: DateRangeShortcut) => {
    resetPage();
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
    if (shortcut === "lastMonth") {
      const lastMonth = now.subtract(1, "month");
      setDateRange([lastMonth.startOf("month"), lastMonth.endOf("month")]);
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

  const listQuery = useMemo(() => ({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    search: debouncedSearch.trim() || undefined,
    accountId: accountFilter === "all" ? undefined : Number(accountFilter),
    type: typeFilter === "all" ? undefined : typeFilter as TransactionRecord["type"],
    categoryId: categoryFilter === "all" ? undefined : Number(categoryFilter),
    fromDate: dateRange[0]?.startOf("day").toISOString(),
    toDate: dateRange[1]?.endOf("day").toISOString(),
    sortBy: sortModel[0]?.field as "date" | "amount" | "createdAt" | undefined,
    sortDirection: sortModel[0]?.sort ?? undefined,
  }), [
    paginationModel,
    debouncedSearch,
    accountFilter,
    typeFilter,
    categoryFilter,
    dateRange,
    sortModel,
  ]);

  const {
    transactions,
    pagination,
    summary: transactionSummary,
    categories,
    goals,
    accounts,
    loading,
    error: pageDataError,
    reload,
  } = useTransactionPageData(hasPrefetched, prefetchedTransactions, listQuery);
  const errorMessage =
    uiError || (pageDataError ? "Failed to load transactions" : "");

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All Categories" },
      ...categories
        .filter((category) => category?.type === "income" || category?.type === "expense")
        .map((category) => ({ value: String(category.id), label: category.name })),
    ],
    [categories],
  );

  const goalNameById = useMemo(() => {
    return goals.reduce((acc: Record<string, string>, goal) => {
      acc[getGoalId(goal)] = goal.name || "Untitled Goal";
      return acc;
    }, {});
  }, [goals]);

  const accountNameById = useMemo(() => {
    return accounts.reduce((acc: Record<number, string>, account) => {
      acc[Number(account.id)] =
        account.displayName || account.institutionName || account.name || "";
      return acc;
    }, {});
  }, [accounts]);

  const accountCurrencyById = useMemo(() => {
    return accounts.reduce((acc: Record<number, string>, account) => {
      acc[Number(account.id)] = account.currency;
      return acc;
    }, {});
  }, [accounts]);

  const selectedAccount = accounts.find(
    (account) => String(account.id) === accountFilter,
  );
  const summaryCurrency = selectedAccount?.currency || accounts[0]?.currency;
  const formatSummaryValue = (value: number | null) =>
    value === null
      ? "Multiple currencies"
      : formatCurrency(value, summaryCurrency);

  const accountOptions = useMemo(
    () => [
      { value: "all", label: "All Accounts" },
      ...accounts.map((account) => ({
        value: String(account.id),
        label:
          account.displayName ||
          account.institutionName ||
          account.name ||
          String(account.id),
      })),
    ],
    [accounts],
  );

  const rows = useMemo(
    () => getTransactionRows(
      transactions as TransactionListRow[],
      accountNameById,
      getTransactionId,
      formatDate,
    ),
    [transactions, accountNameById, formatDate],
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
  const isStatementView = accountFilter !== "all";

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
      type: "INCOME" as const,
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
        field: "transactionId",
        headerName: "TRX#",
        flex: 0.75,
        minWidth: 100,
      },
      {
        field: "date",
        headerName: "Date",
        flex: 0.9,
        minWidth: 120,
        valueGetter: (_value, row) => (row as TransactionTableRow).date,
        valueFormatter: (_value, row) => (row as TransactionTableRow).dateLabel,
      },
      {
        field: "category",
        headerName: isStatementView ? "Description" : "Category",
        flex: 1.2,
        minWidth: 150,
        renderCell: (params) => {
          const row = params.row as TransactionTableRow;
          return isStatementView ? (
            <Box sx={{ display: "grid", alignContent: "center", minWidth: 0, height: "100%" }}>
              <Typography variant="body2" noWrap>{row.notes || row.category}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.category}{row.investment !== "—" ? ` | ${row.investment}` : ""}
              </Typography>
            </Box>
          ) : <Typography variant="body2" noWrap>{row.category}</Typography>;
        },
      },
      {
        field: "source",
        headerName: "Source account",
        flex: 1.15,
        minWidth: 170,
      },
      {
        field: "destination",
        headerName: "Destination account",
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
              tone={params.value === "TRANSFER" ? "transfer" : params.value === "INVESTMENT" ? "investment" : params.value === "EXPENSE" ? "error" : "success"}
            />
          </Box>
        ),
      },
      {
        field: "investment",
        headerName: "Investment",
        flex: 1.25,
        minWidth: 170,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography variant="body2">
              {String(params.value)}
            </Typography>
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
          const isExpense = row.type === "EXPENSE";
          const isMovement = row.type === "TRANSFER" || row.type === "INVESTMENT";
          const movementIcon =
            row.type === "INVESTMENT" ? mdiTrendingUp : mdiSwapHorizontal;
          const color = isMovement
            ? row.type === "TRANSFER" ? "movement.transfer" : "movement.investment"
            : isExpense
              ? "error.main"
              : "success.main";
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 0.5,
                width: "100%",
                height: "100%",
                color,
              }}
            >
              {isMovement ? (
                <Icon path={movementIcon} size={0.7} />
              ) : null}
              <Typography
                variant="body2"
                sx={{
                  color,
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {isMovement ? "" : isExpense ? "-" : "+"} {formatCurrency(
                  params.value as number,
                  accountCurrencyById[Number(row.tx.sourceAccountId ?? row.tx.destinationAccountId)] || summaryCurrency,
                )}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "debitAmount",
        headerName: "Debit",
        type: "number",
        flex: 0.9,
        minWidth: 130,
        sortable: false,
        renderCell: (params) => {
          const amount = Number(params.value || 0);
          return (
            <Typography variant="body2" sx={{ width: "100%", textAlign: "right", color: "error.main", fontWeight: 600 }}>
              {amount ? formatCurrency(amount, selectedAccount?.currency) : "—"}
            </Typography>
          );
        },
      },
      {
        field: "creditAmount",
        headerName: "Credit",
        type: "number",
        flex: 0.9,
        minWidth: 130,
        sortable: false,
        renderCell: (params) => {
          const amount = Number(params.value || 0);
          return (
            <Typography variant="body2" sx={{ width: "100%", textAlign: "right", color: "success.main", fontWeight: 600 }}>
              {amount ? formatCurrency(amount, selectedAccount?.currency) : "—"}
            </Typography>
          );
        },
      },
      {
        field: "balanceAfter",
        headerName: "Balance After",
        type: "number",
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ width: "100%", textAlign: "right", fontWeight: 700 }}>
            {params.value == null ? "—" : formatCurrency(Number(params.value), selectedAccount?.currency)}
          </Typography>
        ),
      },
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
    [
      openEditDrawer,
      openViewDrawer,
      formatCurrency,
      formatDate,
      isStatementView,
      accountCurrencyById,
      summaryCurrency,
      selectedAccount?.currency,
    ],
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
    accountFilter !== "all" ||
    dateRangeShortcut !== "all" ||
    Boolean(dateRange[0]) ||
    Boolean(dateRange[1]);
  const isFirstTransactionSetup =
    (pagination?.total ?? 0) === 0 && !hasTransactionFilters;
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
    disabled: loading,
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
                sm: "repeat(2, minmax(0, 1fr))",
                lg: dateRangeShortcut === "custom"
                  ? "repeat(4, minmax(0, 1fr))"
                  : "minmax(240px, 0.8fr) minmax(240px, 1fr)",
              },
              alignItems: "end",
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <LabeledSelectField
              labelText="Account"
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter((e.target as HTMLInputElement).value);
                resetPage();
              }}
              options={accountOptions}
              size="small"
              fullWidth
            />
            <LabeledSelectField
              labelText="Period"
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
                { value: "lastMonth", label: "Last Month" },
                { value: "thisMonth", label: "This Month" },
                { value: "thisYear", label: "This Year" },
                { value: "custom", label: "Custom Range" },
              ]}
              size="small"
              fullWidth
            />
            {dateRangeShortcut === "custom" ? (
              <>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <LabeledDateField
                    labelText="From"
                    value={dateRange[0]}
                    onChange={(value) => {
                      setDateRange([value, dateRange[1]]);
                      resetPage();
                    }}
                  />
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <LabeledDateField
                    labelText="To"
                    value={dateRange[1]}
                    onChange={(value) => {
                      setDateRange([dateRange[0], value]);
                      resetPage();
                    }}
                  />
                </LocalizationProvider>
              </>
            ) : null}
          </Box>
        )}

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
              title={selectedAccount ? "Opening Balance" : "Income"}
              value={selectedAccount
                ? formatSummaryValue(transactionSummary.openingBalance)
                : formatSummaryValue(transactionSummary.totalIncome)}
              delta={selectedAccount ? "At start of period" : transactionSummary.multiCurrency ? "Select an account for a single-currency total" : "Income transactions"}
              deltaTone="positive"
            />
            <KpiCard
              title={selectedAccount ? "Money In" : "Expenses"}
              value={selectedAccount
                ? formatSummaryValue(transactionSummary.moneyIn)
                : formatSummaryValue(transactionSummary.totalExpense)}
              delta={selectedAccount ? "Credits to this account" : transactionSummary.multiCurrency ? "Select an account for a single-currency total" : "Expense transactions"}
              deltaTone="negative"
            />
            <KpiCard
              title={selectedAccount ? "Money Out" : "Net Cash Flow"}
              value={selectedAccount
                ? formatSummaryValue(transactionSummary.moneyOut)
                : formatSummaryValue(transactionSummary.net)}
              delta={selectedAccount ? "Debits from this account" : transactionSummary.multiCurrency ? "Not combined across currencies" : "Income less expenses"}
              deltaTone={selectedAccount ? "negative" : transactionSummary.net !== null && transactionSummary.net >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              title={selectedAccount ? "Closing Balance" : "Transactions"}
              value={selectedAccount
                ? formatSummaryValue(transactionSummary.closingBalance)
                : transactionSummary.transactionCount}
              delta={selectedAccount ? "At end of period" : "In selected period"}
              deltaTone="neutral"
            />
          </Box>
        )}

        {!loading && !isFirstTransactionSetup && (
          <FilterBar onReset={handleResetFilters}>
            <SearchBar
              className="self-center"
              value={search}
              onChange={(value) => {
                setSearch(value);
                resetPage();
              }}
              placeholder="Search description or notes"
            />

            <LabeledSelectField
              labelText="Category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter((e.target as HTMLInputElement).value)
                resetPage();
              }}
              options={categoryOptions}
              size="small"
              fullWidth
            />

            <LabeledSelectField
              labelText="Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter((e.target as HTMLInputElement).value)
                resetPage();
              }}
              options={[
                { value: "all", label: "All Types" },
                { value: "INCOME", label: "Income" },
                { value: "EXPENSE", label: "Expense" },
                { value: "TRANSFER", label: "Transfer" },
                { value: "INVESTMENT", label: "Investment" },
              ]}
              size="small"
              fullWidth
            />

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
                  paginationMode="server"
                  sortingMode="server"
                  rowCount={pagination?.total ?? 0}
                  pageSizeOptions={[25, 50, 100]}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  sortModel={sortModel}
                  onSortModelChange={(model) => {
                    setSortModel(model);
                    setPaginationModel((previous) => ({ ...previous, page: 0 }));
                  }}
                  columnVisibilityModel={{
                    source: !isStatementView,
                    destination: !isStatementView,
                    investment: !isStatementView,
                    amount: !isStatementView,
                    debitAmount: isStatementView,
                    creditAmount: isStatementView,
                    balanceAfter: isStatementView,
                  }}
                  rowBufferPx={400}
                  columnBufferPx={300}
                  containerSx={{ height: tableHeight }}
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
          accountNameById={accountNameById}
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
