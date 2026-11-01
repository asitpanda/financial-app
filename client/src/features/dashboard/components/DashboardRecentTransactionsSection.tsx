import Icon from "@mdi/react";
import { Box } from "@mui/material";
import { SectionCard } from "../../../components/common";
import { getIconPathByKey } from "../../../constants/categoryIcons";
import type { CategoryRecord } from "../../categories/categories.types";
import type { TransactionRecord } from "../../transactions/transaction.types";
import { getProfitLossHexColor } from "../../../colors";
import { alpha, useTheme } from "@mui/material/styles";

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

import { useCurrencyFormatter } from "../../../utils/currency";
import { useDateFormatter } from "../../../utils/date";

const getTransactionId = (transaction: TransactionRecord) =>
  transaction?._id || transaction?.id;

export default function DashboardRecentTransactionsSection({
  recentTransactions,
  categoryLookup,
  onOpenTransactions,
  onAddTransaction,
}: DashboardRecentTransactionsSectionProps) {
  const theme = useTheme();
  const formatCurrency = useCurrencyFormatter();
  const formatShortDate = useDateFormatter();

  return (
    <SectionCard
      title="Recent Transactions"
      action={
        <button
          type="button"
          onClick={onOpenTransactions}
          className="text-sm font-semibold transition"
          style={{ color: theme.palette.primary.main }}
        >
          View All
        </button>
      }
      className="h-full xl:col-span-1"
      sx={{ boxShadow: 1 }}
      empty={recentTransactions.length === 0}
      emptyState={{
        title: "No transactions in this period",
        description:
          "Add an income or expense to start building recent activity for the selected period.",
        actionLabel: "Add Transaction",
        onAction: onAddTransaction,
      }}
    >
      <Box sx={{ '& > * + *': { borderTop: '1px solid', borderColor: 'divider' } }}>
        {recentTransactions.map((transaction) => {
          const amount = Number(transaction.amount) || 0;
             const isExpense = transaction.type === "EXPENSE";
             const transactionType = isExpense ? "expense" : "income";
          const matchedCategory = categoryLookup.get(
            String(transaction.category || transaction.categoryId || "")
              .trim()
              .toLowerCase(),
          );
             const iconKey = matchedCategory?.icon || DEFAULT_TX_ICON_BY_TYPE[transactionType] || "cash";
          const iconPath =
            getIconPathByKey(iconKey) || getIconPathByKey("cash") || "";
          const iconContainerStyle = matchedCategory?.color
            ? { backgroundColor: matchedCategory.color, color: theme.palette.getContrastText(matchedCategory.color) }
            : {
                backgroundColor: alpha(isExpense ? theme.palette.error.main : theme.palette.success.main, 0.12),
                color: isExpense ? theme.palette.error.main : theme.palette.success.main,
              };

          return (
            <div
              key={getTransactionId(transaction)}
              className="flex items-center justify-between gap-3 py-4 first:pt-1 last:pb-1"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-base font-semibold"
                  style={iconContainerStyle}
                >
                  <Icon path={iconPath} size={0.82} color="currentColor" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: theme.palette.text.primary }}>
                       {transaction.categoryLabelSnapshot || transaction.category || "Transaction"}
                  </div>
                  <div className="text-xs" style={{ color: theme.palette.text.secondary }}>
                       {isExpense ? "Expense" : "Income"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-sm font-semibold"
                  style={{ color: getProfitLossHexColor(isExpense ? -amount : amount, "gain") }}
                >
                  {isExpense ? "-" : "+"}
                  {formatCurrency(amount)}
                </div>
                <div className="mt-1 text-xs" style={{ color: theme.palette.text.secondary }}>
                  {formatShortDate(
                    transaction.date || transaction.createdAt || Date.now(),
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Box>
    </SectionCard>
  );
}
