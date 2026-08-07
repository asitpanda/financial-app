import { SectionCard } from "../../../components/common";
import type {
  DashboardInvestmentActionItem,
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

const ALLOCATION_VISIBLE_LIMIT = 3;

const ACTION_TAG_STYLES: Record<DashboardInvestmentActionItem["kind"], string> = {
  overdue: "bg-rose-100 text-rose-600",
  due: "bg-amber-100 text-amber-600",
  maturing: "bg-sky-100 text-sky-600",
};

const ACTION_TAG_LABELS: Record<DashboardInvestmentActionItem["kind"], string> = {
  overdue: "Overdue",
  due: "Due",
  maturing: "Maturing",
};

const ACTION_AMOUNT_STYLES: Record<DashboardInvestmentActionItem["kind"], string> = {
  overdue: "text-rose-600",
  due: "text-slate-800",
  maturing: "text-slate-800",
};

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
      <div className="space-y-3">
        <div className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Portfolio Value · as of today
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold text-slate-900">
                  {formatCurrency(investmentSummary.currentValue)}
                </span>
                <span
                  className={`text-xs font-semibold ${investmentSummary.unrealisedGain >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {investmentSummary.unrealisedGain >= 0 ? "+" : ""}
                  {formatCurrency(investmentSummary.unrealisedGain)} (
                  {investmentSummary.unrealisedGainPct >= 0 ? "+" : ""}
                  {investmentSummary.unrealisedGainPct.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Invested {formatCurrency(investmentSummary.totalInvested)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {investmentSummary.actionItemsTotalCount === 0 ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  ✓ All caught up
                </span>
              ) : (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    investmentSummary.actionItems[0]?.kind === "overdue"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  ⚠ {investmentSummary.actionItemsTotalCount} need
                  {investmentSummary.actionItemsTotalCount === 1 ? "s" : ""}{" "}
                  attention
                </span>
              )}
              {investmentSummary.staleValuationCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenInvestments}
                  className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-600"
                >
                  {investmentSummary.staleValuationCount} holding
                  {investmentSummary.staleValuationCount === 1 ? "" : "s"}{" "}
                  unvalued 90+ days →
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
                {investmentSummary.allocationBreakdown
                  .slice(0, ALLOCATION_VISIBLE_LIMIT)
                  .map((item, index) => (
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
                {investmentSummary.allocationBreakdown.length >
                  ALLOCATION_VISIBLE_LIMIT && (
                  <div className="pt-0.5 text-[11px] font-medium text-slate-400">
                    +
                    {investmentSummary.allocationBreakdown.length -
                      ALLOCATION_VISIBLE_LIMIT}{" "}
                    more ·{" "}
                    {formatCurrency(
                      investmentSummary.allocationBreakdown
                        .slice(ALLOCATION_VISIBLE_LIMIT)
                        .reduce((sum, item) => sum + item.value, 0),
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-3 text-center text-sm text-slate-400">
                No active allocations
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Needs Attention
            </div>
            {investmentSummary.actionItems.length > 0 ? (
              <div className="space-y-2">
                {investmentSummary.actionItems.map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="flex items-center justify-between gap-2 rounded-[14px] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-900">
                        {item.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ACTION_TAG_STYLES[item.kind]}`}
                        >
                          {ACTION_TAG_LABELS[item.kind]}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatShortDate(item.date)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-semibold ${ACTION_AMOUNT_STYLES[item.kind]}`}
                    >
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
                {investmentSummary.actionItemsTotalCount >
                  investmentSummary.actionItems.length && (
                  <button
                    type="button"
                    onClick={onOpenInvestments}
                    className="text-[11px] font-semibold text-emerald-600 transition hover:text-emerald-700"
                  >
                    +
                    {investmentSummary.actionItemsTotalCount -
                      investmentSummary.actionItems.length}{" "}
                    more →
                  </button>
                )}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400">
                No contributions or maturities need attention
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
