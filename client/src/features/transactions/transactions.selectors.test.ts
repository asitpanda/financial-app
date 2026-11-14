import dayjs from "dayjs";
import { describe, expect, it, vi } from "vitest";
import type { TransactionListRow, TransactionRecord } from "./transaction.types";
import {
  getFilteredTransactions,
  getSortedTransactions,
  getTransactionInsights,
  getTransactionRows,
} from "./transactions.selectors";

const createTransaction = (
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord => ({
  id: "transaction-1",
  type: "EXPENSE",
  amount: 0,
  date: "2026-01-15T12:00:00.000Z",
  userId: "user-1",
  createdAt: "2026-01-15T12:00:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
  ...overrides,
});

describe("transactions.selectors", () => {
  describe("getSortedTransactions", () => {
    it("sorts newest first using created time when the transaction date is empty", () => {
      const oldest = createTransaction({ id: "oldest", date: "2026-01-01" });
      const middle = createTransaction({ id: "middle", date: "2026-02-01" });
      const newest = createTransaction({ id: "newest", date: "", createdAt: "2026-03-01" });
      const transactions = [oldest, middle, newest];

      const sorted = getSortedTransactions(transactions);

      expect(sorted.map(({ id }) => id)).toEqual(["newest", "middle", "oldest"]);
      expect(transactions.map(({ id }) => id)).toEqual(["oldest", "middle", "newest"]);
    });
  });

  describe("getFilteredTransactions", () => {
    const filter = {
      dateRange: [dayjs("2026-01-01"), dayjs("2026-01-31")] as [ReturnType<typeof dayjs>, ReturnType<typeof dayjs>],
      typeFilter: "EXPENSE",
      categoryFilter: "Food",
      sourceAccountFilter: "7",
      destinationAccountFilter: "8",
      search: "linked goal removed",
      goalNameById: {},
      accountNameById: {},
    };

    it("matches transactions within the date, account, category, type, and search filters", () => {
      const transaction = createTransaction({
        categoryLabelSnapshot: "Food",
        sourceAccountId: 7,
        destinationAccountId: 8,
        goalId: "missing-goal",
        notes: "Weekly shopping",
      });

      expect(getFilteredTransactions([transaction], filter)).toEqual([transaction]);
    });

    it("keeps transactions when no filters are selected", () => {
      const transaction = createTransaction();

      expect(getFilteredTransactions([transaction], {
        ...filter,
        dateRange: [null, null],
        typeFilter: "all",
        categoryFilter: "all",
        sourceAccountFilter: "all",
        destinationAccountFilter: "all",
        search: "  ",
      })).toEqual([transaction]);
    });

    it.each([
      ["before the selected date range", { date: "2025-12-01T12:00:00.000Z" }],
      ["after the selected date range", { date: "2026-02-02T12:00:00.000Z" }],
      ["a different transaction type", { type: "INCOME" as const }],
      ["a different category", { category: "Transport" }],
      ["a different source account", { sourceAccountId: 9 }],
      ["a different destination account", { destinationAccountId: 9 }],
      ["a search term that is not present", { notes: "Monthly rent", goalId: null }],
    ] as const)("excludes a transaction that is %s", (_reason, overrides) => {
      const transaction = createTransaction({
        category: "Food",
        categoryLabelSnapshot: "Food",
        sourceAccountId: 7,
        destinationAccountId: 8,
        goalId: "missing-goal",
        ...overrides,
      });

      expect(getFilteredTransactions([transaction], filter)).toEqual([]);
    });

    it("uses account names and resolved goal names when matching a search", () => {
      const transaction = createTransaction({
        category: "Food",
        sourceAccountId: 7,
        destinationAccountId: 8,
        goalId: "goal-1",
        notes: "Weekly shopping",
      });

      expect(getFilteredTransactions([transaction], {
        ...filter,
        search: "  checking trip  ",
        goalNameById: { "goal-1": "Trip" },
        accountNameById: { 7: "Checking" },
      })).toEqual([transaction]);
    });

    it("searches the transaction's own source label when no account name is available", () => {
      const transaction = createTransaction({
        sourceAccountId: 7,
        source: "Cash wallet",
      });

      expect(getFilteredTransactions([transaction], {
        ...filter,
        dateRange: [null, null],
        typeFilter: "all",
        categoryFilter: "all",
        sourceAccountFilter: "all",
        destinationAccountFilter: "all",
        search: "cash wallet",
      })).toEqual([transaction]);
    });
  });

  describe("getTransactionInsights", () => {
    it("totals income, expenses, count, and net for the filtered transactions", () => {
      expect(getTransactionInsights([
        createTransaction({ id: "income", type: "INCOME", amount: 500 }),
        createTransaction({ id: "expense-1", type: "EXPENSE", amount: 125 }),
        createTransaction({ id: "expense-2", type: "EXPENSE", amount: 25 }),
      ])).toEqual({
        totalIncome: 500,
        totalExpense: 150,
        transactionCount: 3,
        net: 350,
      });
    });

    it("returns zero totals when no transactions match", () => {
      expect(getTransactionInsights([])).toEqual({
        totalIncome: 0,
        totalExpense: 0,
        transactionCount: 0,
        net: 0,
      });
    });
  });

  describe("getTransactionRows", () => {
    it("maps transaction details and account-ledger values for the table", () => {
      const transaction: TransactionListRow = {
        id: "transaction-1",
        _id: "legacy-transaction-1",
        type: "EXPENSE",
        amount: 1250,
        category: "Groceries",
        sourceAccountId: 7,
        destinationAccountId: 8,
        date: "2026-11-09T12:00:00.000Z",
        notes: "Weekly shopping",
        userId: "user-1",
        createdAt: "2026-11-09T12:00:00.000Z",
        updatedAt: "2026-11-09T12:00:00.000Z",
        investment: { id: 4, name: "Index Fund" },
        investmentEventType: "CONTRIBUTION",
        debitAmount: 1250,
        creditAmount: 0,
        balanceAfter: 7500,
      };
      const formatDate = vi.fn(() => "Nov 9, 2026");
      const getTransactionId = vi.fn((row: TransactionRecord) => row._id || row.id);

      const [row] = getTransactionRows(
        [transaction],
        { 7: "Checking", 8: "Savings" },
        getTransactionId,
        formatDate,
      );

      expect(row).toMatchObject({
        id: "legacy-transaction-1",
        transactionId: "legacy-transaction-1",
        category: "Groceries",
        source: "Checking",
        destination: "Savings",
        type: "EXPENSE",
        amount: 1250,
        notes: "Weekly shopping",
        investment: "Index Fund",
        investmentEventType: "CONTRIBUTION",
        debitAmount: 1250,
        creditAmount: 0,
        balanceAfter: 7500,
        dateLabel: "Nov 9, 2026",
      });
      expect(row.tx).toBe(transaction);
      expect(getTransactionId).toHaveBeenCalledExactlyOnceWith(transaction);
      expect(formatDate).toHaveBeenCalledExactlyOnceWith(transaction.date);
    });

    it("uses clear fallback labels when optional transaction details are missing", () => {
      const transaction: TransactionRecord = {
        id: "transaction-2",
        type: "EXPENSE",
        amount: 0,
        category: null,
        source: "",
        sourceAccountId: null,
        destinationAccountId: null,
        date: "2026-11-09T12:00:00.000Z",
        userId: "user-1",
        createdAt: "2026-11-09T12:00:00.000Z",
        updatedAt: "2026-11-09T12:00:00.000Z",
      };

      const [row] = getTransactionRows(
        [transaction],
        {},
        (item) => item.id,
        () => "Nov 9, 2026",
      );

      expect(row).toMatchObject({
        category: "Uncategorized",
        source: "Unknown source",
        destination: "No destination",
        amount: 0,
        notes: "",
        investment: "—",
        investmentEventType: "—",
        debitAmount: null,
        creditAmount: null,
        balanceAfter: null,
      });
    });

    it("uses a transaction's source label and creation date when preferred values are missing", () => {
      const transaction = createTransaction({
        id: "transaction-3",
        date: "",
        createdAt: "2026-02-01T12:00:00.000Z",
        categoryLabelSnapshot: "Transport",
        sourceAccountId: 7,
        source: "Cash wallet",
        destinationAccountId: 8,
      });
      const formatDate = vi.fn(() => "Feb 1, 2026");

      const [row] = getTransactionRows(
        [transaction],
        {},
        (item) => item.id,
        formatDate,
      );

      expect(row).toMatchObject({
        category: "Transport",
        source: "Cash wallet",
        destination: "Unknown destination",
        dateLabel: "Feb 1, 2026",
      });
      expect(row.date).toEqual(new Date(transaction.createdAt));
      expect(formatDate).toHaveBeenCalledExactlyOnceWith(transaction.createdAt);
    });

    it("uses the current time when both transaction date fields are missing", () => {
      const transaction = createTransaction({
        date: "",
        createdAt: "",
        type: "" as TransactionRecord["type"],
      });
      const formatDate = vi.fn(() => "Current date");

      const [row] = getTransactionRows(
        [transaction],
        {},
        (item) => item.id,
        formatDate,
      );

      expect(row.date).toBeInstanceOf(Date);
      expect(row.type).toBe("unknown");
      expect(row.dateLabel).toBe("Current date");
      expect(formatDate).toHaveBeenCalledExactlyOnceWith(row.date);
    });
  });
});