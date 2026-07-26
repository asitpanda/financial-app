import React from "react";
import { SectionCard } from "../../../components/common";
import Icon from "@mdi/react";
import { getIconPathByKey } from "../../../constants/categoryIcons";
import type {
  DashboardInvestmentSummary,
  DashboardPageData,
} from "../dashboard.types";

interface DashboardInvestmentsSectionProps {
  selectedPeriodLabel: string;
  investments: DashboardPageData["investments"];
  investmentSummary: DashboardInvestmentSummary;
  onOpenInvestments: () => void;
  onAddInvestment: () => void;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;
const formatShortDate = (value?: string | null) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value || Date.now()));

const INVESTMENT_TYPE_CHART_COLORS = [
  "#059669",
  "#0ea5e9",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

export default function DashboardInvestmentsSection({
  selectedPeriodLabel,
  investments,
  investmentSummary,
  onOpenInvestments,
  onAddInvestment,
}: DashboardInvestmentsSectionProps) {
  return (
    <SectionCard
      title="Investments Snapshot"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
            {selectedPeriodLabel}
          </span>
          <button
            type="button"
            onClick={onOpenInvestments}
            className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            Open Investments
          </button>
        </div>
      }
      className="h-full xl:col-span-2 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
      empty={investments.length === 0}
      emptyState={{
        title: "No investments tracked yet",
        description:
          "Add your first investment to see portfolio value, allocation mix, upcoming contributions, and maturity signals.",
        actionLabel: "Add Investment",
        onAction: onAddInvestment,
      }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Portfolio Value · as of today
            </div>
            <div className="mt-1.5 text-xl font-semibold text-slate-900">
              {formatCurrency(investmentSummary.currentValue)}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              Invested {formatCurrency(investmentSummary.totalInvested)}
              <span
                className={`ml-2 font-semibold ${investmentSummary.unrealisedGain >= 0 ? "text-emerald-600" : "text-rose-500"}`}
              >
                {investmentSummary.unrealisedGain >= 0 ? "+" : ""}
                {formatCurrency(investmentSummary.unrealisedGain)} (
                {investmentSummary.unrealisedGainPct >= 0 ? "+" : ""}
                {investmentSummary.unrealisedGainPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Allocation Mix
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              By category
            </div>
          </div>
          {investmentSummary.allocationBreakdown.length > 0 ? (
            <div className="space-y-2.5">
              {investmentSummary.allocationBreakdown.map((item, index) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[80px_minmax(0,1fr)_56px_72px] items-center gap-2"
                >
                  <div className="truncate text-xs font-medium text-slate-700">
                    {item.label}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(item.pct, 4)}%`,
                        backgroundColor:
                          INVESTMENT_TYPE_CHART_COLORS[
                            index % INVESTMENT_TYPE_CHART_COLORS.length
                          ],
                      }}
                    />
                  </div>
                  <div className="text-right text-[11px] font-semibold text-slate-500">
                    {item.pct.toFixed(0)}%
                  </div>
                  <div className="text-right text-xs font-semibold text-slate-800">
                    {formatCurrency(item.value)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-sm text-slate-400">
              No active allocations
            </div>
          )}
        </div>

        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          In {selectedPeriodLabel}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Due This Month
              </div>
              {investmentSummary.overdueCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  {investmentSummary.overdueCount} overdue
                </span>
              )}
            </div>
            {investmentSummary.allContribDue.length > 0 ? (
              <div className="space-y-2">
                {investmentSummary.allContribDue.map((inv) => {
                  const dueDate = new Date(
                    inv.activeContributionPlan!.nextDueDate!,
                  );
                  dueDate.setHours(0, 0, 0, 0);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = dueDate < today;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-900">
                          {inv.name}
                        </div>
                        <div
                          className={`text-[10px] font-medium ${isOverdue ? "text-rose-500" : "text-slate-400"}`}
                        >
                          {isOverdue ? "Overdue · " : ""}
                          {formatShortDate(
                            inv.activeContributionPlan!.nextDueDate,
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-xs font-semibold ${isOverdue ? "text-rose-600" : "text-slate-800"}`}
                      >
                        {formatCurrency(inv.activeContributionPlan!.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400">
                No contributions due this month
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Maturing Soon
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                90 days
              </span>
            </div>
            {investmentSummary.upcomingMaturities.length > 0 ? (
              <div className="space-y-2">
                {investmentSummary.upcomingMaturities.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-900">
                        {inv.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {inv.institutionName || inv.institution}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-amber-700">
                        {formatShortDate(inv.maturityDate)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatCurrency(inv.currentValue || inv.totalInvested)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400">
                No maturities in next 90 days
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-slate-200 px-4 py-3 text-sm">
          <div>
            <span className="font-semibold text-slate-900">
              {investmentSummary.activeCount}
            </span>
            <span className="ml-1 text-slate-500">
              active investments tracked
            </span>
            {investmentSummary.insuranceCover > 0 && (
              <span className="ml-2 text-slate-400">
                · {formatCurrency(investmentSummary.insuranceCover)} insured
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenInvestments}
            className="font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            Review assets →
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
