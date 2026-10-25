import { SectionCard } from "../../../components/common";
import type { DashboardMonthlySummary } from "../dashboard.types";
import { getProfitLossHexColor } from "../../../colors";
import { useTheme } from "@mui/material/styles";

interface DashboardMonthlySummarySectionProps {
  summary: DashboardMonthlySummary;
  selectedPeriodLabel: string;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function DashboardMonthlySummarySection({
  summary,
  selectedPeriodLabel,
}: DashboardMonthlySummarySectionProps) {
  const theme = useTheme();

  return (
    <SectionCard
      title="Monthly Summary"
      className="h-full shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
      empty={summary.totalTransactions === 0}
      emptyState={{
        title: "No monthly summary yet",
        description:
          "Record income and expenses to generate highlights for highest income, highest expense, and savings rate.",
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg px-4 py-4" style={{ backgroundColor: theme.palette.action.hover }}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.text.secondary }}>
            Highest Income
          </div>
          <div className="mt-3 text-lg font-semibold" style={{ color: theme.palette.text.primary }}>
            {summary.highestIncome
              ? formatCurrency(summary.highestIncome.amount)
              : "-"}
          </div>
          <div className="mt-1 text-sm" style={{ color: theme.palette.text.secondary }}>
            {summary.highestIncome?.category || "No income yet"}
          </div>
        </div>

        <div className="rounded-lg px-4 py-4" style={{ backgroundColor: theme.palette.action.hover }}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.text.secondary }}>
            Highest Expense
          </div>
          <div className="mt-3 text-lg font-semibold" style={{ color: theme.palette.text.primary }}>
            {summary.highestExpense
              ? formatCurrency(summary.highestExpense.amount)
              : "-"}
          </div>
          <div className="mt-1 text-sm" style={{ color: theme.palette.text.secondary }}>
            {summary.highestExpense?.category || "No expenses yet"}
          </div>
        </div>

        <div className="rounded-lg px-4 py-4" style={{ backgroundColor: theme.palette.action.hover }}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.text.secondary }}>
            Transactions
          </div>
          <div className="mt-3 text-lg font-semibold" style={{ color: theme.palette.text.primary }}>
            {summary.totalTransactions}
          </div>
          <div className="mt-1 text-sm" style={{ color: theme.palette.success.main }}>
            In {selectedPeriodLabel}
          </div>
        </div>

        <div className="rounded-lg px-4 py-4" style={{ backgroundColor: theme.palette.action.hover }}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.text.secondary }}>
            Savings Rate
          </div>
          <div className="mt-3 text-lg font-semibold" style={{ color: theme.palette.text.primary }}>
            {summary.savingsRate.toFixed(1)}%
          </div>
          <div
            className="mt-1 text-sm"
            style={{ color: getProfitLossHexColor(summary.savingsRate, "gain") }}
          >
            Avg expense {formatCurrency(summary.averageExpense)}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
