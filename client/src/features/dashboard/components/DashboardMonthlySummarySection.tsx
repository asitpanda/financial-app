import React from "react";
import { SectionCard } from "../../../components/common";
import type { DashboardMonthlySummary } from "../dashboard.types";

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
        <div className="rounded-[22px] bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Highest Income
          </div>
          <div className="mt-3 text-lg font-semibold text-slate-900">
            {summary.highestIncome
              ? formatCurrency(summary.highestIncome.amount)
              : "-"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary.highestIncome?.category || "No income yet"}
          </div>
        </div>

        <div className="rounded-[22px] bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Highest Expense
          </div>
          <div className="mt-3 text-lg font-semibold text-slate-900">
            {summary.highestExpense
              ? formatCurrency(summary.highestExpense.amount)
              : "-"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {summary.highestExpense?.category || "No expenses yet"}
          </div>
        </div>

        <div className="rounded-[22px] bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Transactions
          </div>
          <div className="mt-3 text-lg font-semibold text-slate-900">
            {summary.totalTransactions}
          </div>
          <div className="mt-1 text-sm text-emerald-600">
            In {selectedPeriodLabel}
          </div>
        </div>

        <div className="rounded-[22px] bg-slate-50 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Savings Rate
          </div>
          <div className="mt-3 text-lg font-semibold text-slate-900">
            {summary.savingsRate.toFixed(1)}%
          </div>
          <div
            className={`mt-1 text-sm ${summary.savingsRate >= 0 ? "text-emerald-600" : "text-rose-500"}`}
          >
            Avg expense {formatCurrency(summary.averageExpense)}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
