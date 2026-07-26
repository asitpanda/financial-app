import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { TransactionRecord } from "./transaction.types";
import type { PageDateFilterMode } from "../../store/pageDateFilterStore";

interface TransactionFilterInput {
  dateRange: [Dayjs | null, Dayjs | null];
  typeFilter: string;
  categoryFilter: string;
  search: string;
  goalNameById: Record<string, string>;
  accountNameById: Record<number, string>;
}

interface TransactionInsights {
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
  net: number;
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

export const getSortedTransactions = (
  transactions: TransactionRecord[],
  periodMode: PageDateFilterMode,
  selectedYear: number,
  selectedMonth: number,
  matchesPageDateFilter: (
    date: Date,
    mode: PageDateFilterMode,
    year: number,
    month: number,
  ) => boolean,
) => {
  const pageFilteredTransactions = transactions.filter(
    (tx: TransactionRecord) => {
      const transactionDate = new Date(tx.date || tx.createdAt || Date.now());
      return matchesPageDateFilter(
        transactionDate,
        periodMode,
        selectedYear,
        selectedMonth,
      );
    },
  );

  return [...pageFilteredTransactions].sort(
    (a: TransactionRecord, b: TransactionRecord) =>
      new Date(b.date || b.createdAt).getTime() -
      new Date(a.date || a.createdAt).getTime(),
  );
};

export const getFilteredTransactions = (
  sortedTransactions: TransactionRecord[],
  {
    dateRange,
    typeFilter,
    categoryFilter,
    search,
    goalNameById,
    accountNameById,
  }: TransactionFilterInput,
) => {
  const [from, to] = dateRange;

  return sortedTransactions.filter((tx: TransactionRecord) => {
    const date = new Date(tx.date || tx.createdAt || Date.now());
    const txDate = dayjs(date);
    const goalName = tx.goalId
      ? goalNameById[String(tx.goalId)] || "Linked goal removed"
      : "";
    const txCategory = tx.category || tx.categoryLabelSnapshot || "";
    const sourceLabel =
      accountNameById[Number(tx.sourceAccountId)] ||
      tx.source ||
      (tx.sourceAccountId != null
        ? String(tx.sourceAccountId)
        : "Unknown source");

    if (from && txDate.isBefore(from.startOf("day"))) return false;
    if (to && txDate.isAfter(to.endOf("day"))) return false;

    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (categoryFilter !== "all" && txCategory !== categoryFilter) return false;

    const haystack =
      `${txCategory} ${tx.type || ""} ${sourceLabel} ${goalName} ${tx.notes || ""}`.toLowerCase();
    if (search.trim() && !haystack.includes(search.trim().toLowerCase()))
      return false;

    return true;
  });
};

export const getTransactionInsights = (
  filteredTransactions: TransactionRecord[],
): TransactionInsights => {
  const summary = filteredTransactions.reduce(
    (acc: Omit<TransactionInsights, "net">, tx: TransactionRecord) => {
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
    { totalIncome: 0, totalExpense: 0, transactionCount: 0 },
  );

  return {
    ...summary,
    net: summary.totalIncome - summary.totalExpense,
  };
};

export const getTransactionRows = (
  tableTransactions: TransactionRecord[],
  accountNameById: Record<number, string>,
  getTransactionId: (tx: TransactionRecord) => string,
): TransactionTableRow[] => {
  return tableTransactions.map((tx: TransactionRecord) => {
    const txDate = new Date(tx.date || tx.createdAt || Date.now());
    const txId = getTransactionId(tx);

    return {
      id: txId,
      tx,
      date: txDate,
      dateLabel: txDate.toLocaleDateString(),
      category: tx.category || tx.categoryLabelSnapshot || "Uncategorized",
      source:
        accountNameById[Number(tx.sourceAccountId)] ||
        tx.source ||
        (tx.sourceAccountId != null
          ? String(tx.sourceAccountId)
          : "Unknown source"),
      type: tx.type || "unknown",
      amount: Number(tx.amount || 0),
      notes: tx.notes || "",
    };
  });
};
