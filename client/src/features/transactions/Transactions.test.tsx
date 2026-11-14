import dayjs from "dayjs";
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Header from "../../layout/Header";
import { useAuth } from "../auth/useAuth";
import { useAppStore } from "../../store/appStore";
import { useDialogStore } from "../../store/dialogStore";
import { useDrawerStore } from "../../store/drawerStore";
import { useHeaderActionStore } from "../../store/headerActionStore";
import { useNotificationStore } from "../../store/notificationStore";
import { renderWithProviders, userEvent } from "../../test/test-utils";
import type { TransactionRecord } from "./transaction.types";
import Transactions from "./Transactions";
import { useTransactionPageData } from "./useTransactions";

const mutationMocks = vi.hoisted(() => ({
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("./useTransactions", () => ({
  useTransactionPageData: vi.fn(),
  useSaveTransaction: () => ({ mutateAsync: mutationMocks.save }),
  useRemoveTransaction: () => ({ mutateAsync: mutationMocks.remove }),
}));

vi.mock("./components/TransactionsAddEditDrawer", () => ({
  default: ({
    open,
    onSubmit,
    initialValues,
  }: {
    open: boolean;
    onSubmit: (payload: unknown) => Promise<string | null>;
    initialValues: unknown;
  }) => open ? (
    <div>
      <div>Transaction form opened</div>
      <output>{JSON.stringify(initialValues)}</output>
      <button
        onClick={() => onSubmit({ type: "EXPENSE", amount: 25, date: "2026-01-15" })}
      >
        Submit transaction form
      </button>
    </div>
  ) : null,
}));

vi.mock("./components/TransactionViewDrawer", () => ({
  TransactionViewDrawer: ({
    open,
    transaction,
    onViewInvestment,
    onEdit,
    onDelete,
  }: {
    open: boolean;
    transaction: TransactionRecord | null;
    onViewInvestment: (investmentId: string | number) => void;
    onEdit: (transaction: TransactionRecord) => void;
    onDelete: (transaction: TransactionRecord) => void;
  }) => open ? (
    <div>
      <button onClick={() => onViewInvestment("investment-45")}>Open linked investment</button>
      {transaction ? (
        <>
          <button onClick={() => onEdit(transaction)}>Edit from transaction view</button>
          <button onClick={() => onDelete(transaction)}>Delete from transaction view</button>
        </>
      ) : null}
    </div>
  ) : null,
}));

vi.mock("../../components/dialogs", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => Promise<void>;
  }) => open ? (
    <button onClick={onConfirm}>Confirm transaction deletion</button>
  ) : null,
}));

vi.mock("../../components/common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/common")>();
  return {
    ...actual,
    DataTable: (props: any) => (
      <div data-testid="transactions-table">
        {props.rows.map((row: any) => (
          <div key={row.id}>
            <span>{row.category}</span>
            {props.columns.map((column: any) => column.renderCell ? (
              <div key={column.field}>
                {column.renderCell({ row, value: row[column.field] })}
              </div>
            ) : null)}
          </div>
        ))}
        <button
          aria-label="Next transaction page"
          onClick={() => props.onPaginationModelChange({
            page: 1,
            pageSize: props.paginationModel.pageSize,
          })}
        />
        <button
          aria-label="Sort transactions by amount"
          onClick={() => props.onSortModelChange([{ field: "amount", sort: "asc" }])}
        />
      </div>
    ),
  };
});

type PageData = ReturnType<typeof useTransactionPageData>;

const createPageData = (overrides: Partial<PageData> = {}): PageData => ({
  transactions: [],
  pagination: {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
  },
  summary: {
    totalIncome: 0,
    totalExpense: 0,
    net: 0,
    transactionCount: 0,
    openingBalance: null,
    moneyIn: null,
    moneyOut: null,
    closingBalance: null,
    multiCurrency: false,
  },
  categories: [],
  goals: [],
  accounts: [],
  loading: false,
  error: null,
  reload: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderTransactions = (
  pageData: PageData,
  props: { prefetchedTransactions?: TransactionRecord[]; prefillFilter?: unknown } = {},
) => {
  vi.mocked(useTransactionPageData).mockReturnValue(pageData);
  return renderWithProviders(
    <>
      <Header activeScreen="transactions" />
      <Transactions {...props} />
    </>,
  );
};

const getLatestListQuery = () => {
  const calls = vi.mocked(useTransactionPageData).mock.calls;
  return calls[calls.length - 1]?.[2];
};

const createPopulatedPageData = (
  overrides: Partial<PageData> = {},
): PageData => createPageData({
  transactions: [{
    id: "transaction-1",
    type: "EXPENSE",
    amount: 35,
    category: "Groceries",
    sourceAccountId: 7,
    date: "2026-01-15T12:00:00.000Z",
    notes: "Weekly shopping",
    userId: "user-1",
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
    debitAmount: 35,
    creditAmount: null,
    balanceAfter: 965,
  }],
  pagination: {
    page: 1,
    limit: 25,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
  },
  categories: [{ id: "food", name: "Food", type: "expense" }],
  accounts: [{ id: 7, name: "Checking", currency: "USD" } as never],
  ...overrides,
});

describe("Transactions", () => {
  beforeEach(() => {
    useAuth.setState({ user: null });
    useAppStore.setState({ activeScreen: "dashboard" });
    window.history.replaceState({}, "", "/");
    useHeaderActionStore.setState({ actions: {} });
    useDrawerStore.getState().closeDrawer();
    useDialogStore.getState().closeDialog();
    useNotificationStore.getState().clearNotifications();
    vi.clearAllMocks();
    mutationMocks.save.mockResolvedValue({ id: "transaction-2" });
    mutationMocks.remove.mockResolvedValue(undefined);
  });

  it("requires a category before starting the first transaction", async () => {
    renderTransactions(
      createPageData({ accounts: [{ id: 7, name: "Checking", currency: "USD" } as never] }),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Transaction" }));

    expect(await screen.findByText("Please add a category before adding a transaction.")).toBeInTheDocument();
    expect(useDrawerStore.getState().open).toBe(false);
    expect(useNotificationStore.getState().notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "warning",
          message: "Please add a category before adding a transaction.",
        }),
      ]),
    );
  });

  it("requires a financial account before starting the first transaction", async () => {
    renderTransactions(
      createPageData({
        categories: [{ id: "food", name: "Food", type: "expense" }],
      }),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Transaction" }));

    expect(await screen.findByText("Please add a financial account before adding a transaction.")).toBeInTheDocument();
    expect(useDrawerStore.getState().open).toBe(false);
    expect(useNotificationStore.getState().notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "warning",
          message: "Please add a financial account before adding a transaction.",
        }),
      ]),
    );
  });

  it("opens the transaction form when categories and accounts are available", async () => {
    renderTransactions(
      createPageData({
        categories: [{ id: "food", name: "Food", type: "expense" }],
        accounts: [{ id: 7, name: "Checking", currency: "USD" } as never],
      }),
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Transaction" }));

    expect(await screen.findByText("Transaction form opened")).toBeInTheDocument();
    expect(useDrawerStore.getState()).toMatchObject({
      open: true,
      type: "transaction",
      mode: "create",
      step: "form",
    });
  });

  it("prefills a transaction with the selected goal's category", () => {
    useDrawerStore.getState().openDrawer({
      type: "transaction",
      mode: "create",
      entityId: "goal-1",
      step: "form",
    });
    renderTransactions(createPageData({
      goals: [
        { _id: "goal-1", name: "Summer trip", category: "Travel" } as never,
        { id: "goal-2", name: "Emergency fund" } as never,
      ],
    }));

    expect(screen.getByText('{"goalId":"goal-1","type":"INCOME","category":"Travel"}')).toBeInTheDocument();
  });

  it.each([
    [{ mode: "monthly", fiscalYearStart: 2025, month: 0 }, "2026-01-01", "2026-01-31"],
    [{ mode: "monthly", fiscalYearStart: 2025, month: 3 }, "2025-04-01", "2025-04-30"],
    [{ mode: "yearly", fiscalYearStart: 2025 }, "2025-04-01", "2026-03-31"],
  ] as const)("applies the fiscal date range from dashboard context", async (prefillFilter, expectedStart, expectedEnd) => {
    renderTransactions(createPopulatedPageData(), { prefillFilter });

    await waitFor(() => {
      const query = getLatestListQuery();
      expect(dayjs(query?.fromDate).format("YYYY-MM-DD")).toBe(expectedStart);
      expect(dayjs(query?.toDate).format("YYYY-MM-DD")).toBe(expectedEnd);
    });
  });

  it("ignores an invalid dashboard date context", async () => {
    renderTransactions(createPopulatedPageData(), {
      prefillFilter: { mode: "yearly", fiscalYearStart: "2025" },
    });

    await waitFor(() => {
      expect(getLatestListQuery()?.fromDate).toBeUndefined();
      expect(getLatestListQuery()?.toDate).toBeUndefined();
    });
  });

  it.each([
    ["all", "All Time"],
    ["last7", "Last 7 Days"],
    ["last30", "Last 30 Days"],
    ["lastMonth", "Last Month"],
    ["thisMonth", "This Month"],
    ["thisYear", "This Year"],
    ["custom", "Custom Range"],
  ] as const)("applies the %s date-range shortcut", async (shortcut, label) => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData());

    if (shortcut === "all") {
      await user.click(screen.getAllByRole("combobox")[1]);
      await user.click(screen.getByRole("option", { name: "Last 7 Days" }));
      await waitFor(() => expect(getLatestListQuery()?.fromDate).toBeTruthy());
    }

    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: label }));

    if (shortcut === "all" || shortcut === "custom") {
      await waitFor(() => {
        expect(getLatestListQuery()?.fromDate).toBeUndefined();
        expect(getLatestListQuery()?.toDate).toBeUndefined();
      });
    } else {
      await waitFor(() => {
        expect(getLatestListQuery()?.fromDate).toBeTruthy();
        expect(getLatestListQuery()?.toDate).toBeTruthy();
      });
    }

    if (shortcut === "custom") {
      expect(screen.getByText("From")).toBeInTheDocument();
      expect(screen.getByText("To")).toBeInTheDocument();
    }
  });

  it("applies account, category, type, period, and search filters and resets them", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData({
      transactions: [],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false },
      categories: [{ id: "3", name: "Food", type: "expense" }],
    }));

    expect(screen.getByText("No transactions found")).toBeInTheDocument();
    const selects = screen.getAllByRole("combobox");
    await user.click(selects[0]);
    await user.click(screen.getByRole("option", { name: "Checking" }));
    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "Last 30 Days" }));
    await user.click(screen.getAllByRole("combobox")[2]);
    await user.click(screen.getByRole("option", { name: "Food" }));
    await user.click(screen.getAllByRole("combobox")[3]);
    await user.click(screen.getByRole("option", { name: "Expense" }));
    await user.type(screen.getByPlaceholderText("Search description or notes"), "  coffee  ");

    await waitFor(() => {
      expect(getLatestListQuery()).toMatchObject({
        accountId: 7,
        categoryId: 3,
        type: "EXPENSE",
        search: "coffee",
      });
      expect(getLatestListQuery()?.fromDate).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Reset Filters" }));

    await waitFor(() => {
      expect(getLatestListQuery()).toMatchObject({ page: 1 });
      expect(getLatestListQuery()?.accountId).toBeUndefined();
      expect(getLatestListQuery()?.categoryId).toBeUndefined();
      expect(getLatestListQuery()?.type).toBeUndefined();
      expect(getLatestListQuery()?.search).toBeUndefined();
      expect(getLatestListQuery()?.fromDate).toBeUndefined();
      expect(getLatestListQuery()?.toDate).toBeUndefined();
    });
    expect(screen.getByPlaceholderText("Search description or notes")).toHaveValue("");
  });

  it("restores the dashboard fiscal period when filters are reset", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData(), {
      prefillFilter: { mode: "monthly", fiscalYearStart: 2025, month: 0 },
    });

    await user.click(screen.getAllByRole("combobox")[3]);
    await user.click(screen.getByRole("option", { name: "Expense" }));
    await user.click(screen.getByRole("button", { name: "Reset Filters" }));

    await waitFor(() => {
      expect(dayjs(getLatestListQuery()?.fromDate).format("YYYY-MM-DD")).toBe("2026-01-01");
      expect(dayjs(getLatestListQuery()?.toDate).format("YYYY-MM-DD")).toBe("2026-01-31");
    });
  });

  it("requests the selected server page and sort order", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "Next transaction page" }));
    await waitFor(() => expect(getLatestListQuery()?.page).toBe(2));

    await user.click(screen.getByRole("button", { name: "Sort transactions by amount" }));

    await waitFor(() => {
      expect(getLatestListQuery()).toMatchObject({
        page: 1,
        sortBy: "amount",
        sortDirection: "asc",
      });
    });
  });

  it("disables transaction creation and shows loading while page data is pending", () => {
    renderTransactions(createPageData({
      loading: true,
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false },
    }));

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transaction" })).toBeDisabled();
  });

  it("shows a page-level error when transaction data cannot be loaded", () => {
    renderTransactions(createPageData({ error: new Error("Offline") }));

    expect(screen.getByText("Failed to load transactions")).toBeInTheDocument();
  });

  it("renders mixed-currency guidance and switches to account statement details", async () => {
    const user = userEvent.setup();
    const pageData = createPopulatedPageData({
      summary: {
        totalIncome: null,
        totalExpense: null,
        net: null,
        transactionCount: 1,
        openingBalance: 900,
        moneyIn: 100,
        moneyOut: 35,
        closingBalance: 965,
        multiCurrency: true,
      },
    });
    renderTransactions(pageData);

    expect(screen.getAllByText("Select an account for a single-currency total")).toHaveLength(2);
    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByRole("option", { name: "Checking" }));

    expect(screen.getByText("Opening Balance")).toBeInTheDocument();
    expect(screen.getByText("Weekly shopping")).toBeInTheDocument();
    expect(getLatestListQuery()?.accountId).toBe(7);
  });

  it("renders distinct status and amount treatments for income, transfer, and investment rows", () => {
    const baseTransaction = createPopulatedPageData().transactions[0];
    renderTransactions(createPopulatedPageData({
      transactions: [
        { ...baseTransaction, id: "income-1", type: "INCOME", amount: 100, creditAmount: 100 },
        {
          ...baseTransaction,
          id: "transfer-1",
          type: "TRANSFER",
          amount: 20,
          sourceAccountId: null,
          destinationAccountId: 7,
          debitAmount: 20,
          creditAmount: 20,
          balanceAfter: null,
        },
        {
          ...baseTransaction,
          id: "investment-1",
          type: "INVESTMENT",
          amount: 40,
          sourceAccountId: null,
          destinationAccountId: 7,
          investment: { id: 45, name: "Index Fund" },
          debitAmount: 40,
          creditAmount: null,
          balanceAfter: 500,
        },
      ],
    }));

    expect(screen.getByText("INCOME")).toBeInTheDocument();
    expect(screen.getByText("TRANSFER")).toBeInTheDocument();
    expect(screen.getByText("INVESTMENT")).toBeInTheDocument();
  });

  it("opens a selected transaction in the view drawer", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "View Groceries" }));

    expect(useDrawerStore.getState()).toMatchObject({
      open: true,
      type: "transaction",
      mode: "view",
      entityId: "transaction-1",
      step: "overview",
    });
  });

  it("navigates to the linked investment from the transaction view", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "View Groceries" }));
    await user.click(await screen.findByRole("button", { name: "Open linked investment" }));

    expect(useAppStore.getState().activeScreen).toBe("investments");
    expect(window.location.pathname).toBe("/investments");
    expect(window.location.search).toBe("?investmentId=investment-45");
  });

  it("opens the edit form from the transaction detail view", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "View Groceries" }));
    await user.click(await screen.findByRole("button", { name: "Edit from transaction view" }));

    expect(useDrawerStore.getState()).toMatchObject({ open: true, mode: "edit" });
    expect(await screen.findByRole("button", { name: "Submit transaction form" })).toBeInTheDocument();
  });

  it("opens the delete confirmation from the transaction detail view", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "View Groceries" }));
    await user.click(await screen.findByRole("button", { name: "Delete from transaction view" }));

    expect(useDrawerStore.getState().open).toBe(false);
    expect(useDialogStore.getState()).toMatchObject({
      open: true,
      type: "confirmDelete",
      payload: { entity: "transaction", id: "transaction-1" },
    });
  });

  it("updates an unlinked transaction from the edit form", async () => {
    const user = userEvent.setup();
    const pageData = createPopulatedPageData();
    renderTransactions(pageData);

    await user.click(screen.getByRole("button", { name: "Edit Groceries" }));
    expect(await screen.findByRole("button", { name: "Submit transaction form" })).toBeInTheDocument();
    expect(useDrawerStore.getState()).toMatchObject({
      open: true,
      mode: "edit",
      entityId: "transaction-1",
    });

    await user.click(screen.getByRole("button", { name: "Submit transaction form" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "success", message: "Transaction updated successfully" }),
        ]),
      );
    });
    expect(mutationMocks.save).toHaveBeenCalledExactlyOnceWith({
      payload: { type: "EXPENSE", amount: 25, date: "2026-01-15" },
      selectedTransaction: pageData.transactions[0],
    });
  });

  it("keeps linked investment activity view-only", async () => {
    const user = userEvent.setup();
    renderTransactions(createPopulatedPageData({
      transactions: [{
        ...createPopulatedPageData().transactions[0],
        investment: { id: 45, name: "Index Fund" },
      }],
    }));

    expect(screen.getByRole("button", { name: "Edit Groceries" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete Groceries" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "View Groceries" }));

    expect(useDrawerStore.getState()).toMatchObject({ open: true, mode: "view" });
  });

  it("saves a new transaction, closes the form, and reloads the page data", async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    renderTransactions(createPopulatedPageData({ reload }));

    await user.click(screen.getByRole("button", { name: "Transaction" }));
    await user.click(await screen.findByRole("button", { name: "Submit transaction form" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "success", message: "Transaction added successfully" }),
        ]),
      );
    });
    expect(mutationMocks.save).toHaveBeenCalledExactlyOnceWith({
      payload: { type: "EXPENSE", amount: 25, date: "2026-01-15" },
      selectedTransaction: null,
    });
    expect(useDrawerStore.getState().open).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("keeps the form open and reports a server validation error when saving fails", async () => {
    const user = userEvent.setup();
    mutationMocks.save.mockRejectedValue({ response: { data: { message: ["Amount is invalid"] } } });
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "Transaction" }));
    await user.click(await screen.findByRole("button", { name: "Submit transaction form" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "error", message: "Amount is invalid" }),
        ]),
      );
    });
    expect(useDrawerStore.getState().open).toBe(true);
    expect(screen.getByRole("button", { name: "Submit transaction form" })).toBeInTheDocument();
  });

  it.each([
    [new Error("Offline"), "Offline"],
    [{}, "Failed to add transaction"],
  ])("reports a fallback create error when the server omits its validation message", async (failure, expectedMessage) => {
    const user = userEvent.setup();
    mutationMocks.save.mockRejectedValue(failure);
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "Transaction" }));
    await user.click(await screen.findByRole("button", { name: "Submit transaction form" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "error", message: expectedMessage }),
        ]),
      );
    });
    expect(useDrawerStore.getState().open).toBe(true);
  });

  it("confirms transaction deletion, closes the dialog, and reloads page data", async () => {
    const user = userEvent.setup();
    const reload = vi.fn().mockResolvedValue(undefined);
    renderTransactions(createPopulatedPageData({ reload }));

    await user.click(screen.getByRole("button", { name: "Delete Groceries" }));
    await user.click(await screen.findByRole("button", { name: "Confirm transaction deletion" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "success", message: "Transaction deleted successfully" }),
        ]),
      );
    });
    expect(mutationMocks.remove).toHaveBeenCalledExactlyOnceWith("transaction-1");
    expect(useDialogStore.getState().open).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("reports a delete failure and leaves the confirmation open for recovery", async () => {
    const user = userEvent.setup();
    mutationMocks.remove.mockRejectedValue({ response: { data: { message: ["Transaction is locked"] } } });
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "Delete Groceries" }));
    await user.click(await screen.findByRole("button", { name: "Confirm transaction deletion" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "error", message: "Transaction is locked" }),
        ]),
      );
    });
    expect(useDialogStore.getState().open).toBe(true);
  });

  it.each([
    [new Error("Offline"), "Offline"],
    [{}, "Failed to delete transaction"],
  ])("reports a fallback delete error when the server omits its validation message", async (failure, expectedMessage) => {
    const user = userEvent.setup();
    mutationMocks.remove.mockRejectedValue(failure);
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "Delete Groceries" }));
    await user.click(await screen.findByRole("button", { name: "Confirm transaction deletion" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "error", message: expectedMessage }),
        ]),
      );
    });
    expect(useDialogStore.getState().open).toBe(true);
  });

  it("rejects a delete confirmation that has no transaction ID", async () => {
    const user = userEvent.setup();
    useDialogStore.getState().openDialog("confirmDelete", { entity: "transaction" });
    renderTransactions(createPopulatedPageData());

    await user.click(screen.getByRole("button", { name: "Confirm transaction deletion" }));

    expect(useNotificationStore.getState().notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "error", message: "Failed to delete transaction" }),
      ]),
    );
    expect(mutationMocks.remove).not.toHaveBeenCalled();
  });
});