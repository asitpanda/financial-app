import React from "react";
import Icon from "@mdi/react";
import { SectionCard } from "../../../components/common";
import { getIconPathByKey } from "../../../constants/categoryIcons";
import type { CategoryRecord } from "../../categories/categories.types";
import type { TransactionRecord } from "../../transactions/transaction.types";

interface DashboardRecentTransactionsSectionProps {
  recentTransactions: TransactionRecord[];
  categoryLookup: Map<string, CategoryRecord>;
  onOpenTransactions: () => void;
  onAddTransaction: () => void;
}

const DEFAULT_TX_ICON_BY_TYPE: Record<"income" | "expense", string> = {
  income: "briefcase",
  expense: "cart",
};

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;
const formatShortDate = (value: string | number | Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const getTransactionId = (transaction: TransactionRecord) =>
  transaction?._id || transaction?.id;

export default function DashboardRecentTransactionsSection({
  recentTransactions,
  categoryLookup,
  onOpenTransactions,
  onAddTransaction,
}: DashboardRecentTransactionsSectionProps) {
  return (
    <SectionCard
      title="Recent Transactions"
      action={
        <button
          type="button"
          onClick={onOpenTransactions}
          className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
        >
          View All
        </button>
      }
      className="h-full xl:col-span-1 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
      empty={recentTransactions.length === 0}
      emptyState={{
        title: "No transactions in this period",
        description:
          "Add an income or expense to start building recent activity for the selected period.",
        actionLabel: "Add Transaction",
        onAction: onAddTransaction,
      }}
    >
      <div className="divide-y divide-slate-200/80">
        {recentTransactions.map((transaction) => {
          const amount = Number(transaction.amount) || 0;
          const isExpense = transaction.type === "expense";
          const matchedCategory = categoryLookup.get(
            String(transaction.category || transaction.categoryId || "")
              .trim()
              .toLowerCase(),
          );
          const iconKey =
            matchedCategory?.icon ||
            DEFAULT_TX_ICON_BY_TYPE[transaction.type || "expense"] ||
            "cash";
          const iconPath =
            getIconPathByKey(iconKey) || getIconPathByKey("cash");
          const iconContainerStyle = matchedCategory?.color
            ? { backgroundColor: matchedCategory.color, color: "#ffffff" }
            : undefined;

          return (
            <div
              key={getTransactionId(transaction)}
              className="flex items-center justify-between gap-3 py-4 first:pt-1 last:pb-1"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl text-base font-semibold ${matchedCategory?.color ? "" : isExpense ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"}`}
                  style={iconContainerStyle}
                >
                  <Icon path={iconPath} size={0.82} color="currentColor" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {transaction.title || transaction.category || "Transaction"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {transaction.type === "expense" ? "Expense" : "Income"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-semibold ${isExpense ? "text-rose-500" : "text-emerald-600"}`}
                >
                  {isExpense ? "-" : "+"}
                  {formatCurrency(amount)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {formatShortDate(
                    transaction.date || transaction.createdAt || Date.now(),
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
