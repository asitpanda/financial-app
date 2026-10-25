import { SectionCard } from "../../../components/common";
import type {
  DashboardInvestmentActionItem,
  DashboardInvestmentSummary,
  DashboardPageData,
} from "../dashboard.types";
import { getStableSeriesColorMap } from "../../../colors";
import { useTheme } from "@mui/material/styles";

interface DashboardInvestmentsSectionProps {
  selectedPeriodLabel?: string;
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

const ALLOCATION_VISIBLE_LIMIT = 7;

const ACTION_TAG_LABELS: Record<DashboardInvestmentActionItem["kind"], string> = {
  overdue: "Overdue",
  due: "Due",
  maturing: "Maturing",
};

export default function DashboardInvestmentsSection({
  investments,
  investmentSummary,
  onOpenInvestments,
  onAddInvestment,
}: DashboardInvestmentsSectionProps) {
  const theme = useTheme();
  const allocationColorByKey = getStableSeriesColorMap(
    investmentSummary.allocationBreakdown.map((item) => item.key),
    "dashboard-investments-allocation",
  );

  return (
    <SectionCard
      title="Investments Snapshot"
      action={
        <button
          type="button"
          onClick={onOpenInvestments}
          className="text-sm font-semibold transition"
          style={{ color: theme.palette.primary.main }}
        >
          Open Investments
        </button>
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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div
            className="rounded-lg border px-4 py-3"
            style={{ borderColor: theme.palette.divider, backgroundColor: theme.palette.action.hover }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.palette.text.secondary }}>
                Allocation Mix
              </div>
              <div className="text-[11px] font-semibold" style={{ color: theme.palette.text.secondary }}>
                By category
              </div>
            </div>
            {investmentSummary.allocationBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {investmentSummary.allocationBreakdown
                  .slice(0, ALLOCATION_VISIBLE_LIMIT)
                  .map((item) => (
                    <div
                      key={item.key}
                      className="grid grid-cols-[80px_minmax(0,1fr)_56px_72px] items-center gap-2"
                    >
                      <div className="truncate text-xs font-medium" style={{ color: theme.palette.text.primary }}>
                        {item.label}
                      </div>
                      <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: theme.palette.divider }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(item.pct, 4)}%`,
                            backgroundColor:
                              allocationColorByKey.get(item.key) ?? "#94a3b8",
                          }}
                        />
                      </div>
                      <div className="text-right text-[11px] font-semibold" style={{ color: theme.palette.text.secondary }}>
                        {item.pct.toFixed(0)}%
                      </div>
                      <div className="text-right text-xs font-semibold" style={{ color: theme.palette.text.primary }}>
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  ))}
                {investmentSummary.allocationBreakdown.length >
                  ALLOCATION_VISIBLE_LIMIT && (
                  <div className="pt-0.5 text-[11px] font-medium" style={{ color: theme.palette.text.secondary }}>
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
              <div className="py-3 text-center text-sm" style={{ color: theme.palette.text.secondary }}>
                No active allocations
              </div>
            )}
          </div>

          <div
            className="rounded-lg border px-4 py-3"
            style={{ borderColor: theme.palette.divider, backgroundColor: theme.palette.action.hover }}
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.palette.text.secondary }}>
                Needs Attention
              </div>
              {investmentSummary.actionItemsTotalCount === 0 ? (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: theme.palette.success.light, color: theme.palette.success.dark }}
                >
                  ✓ All caught up
                </span>
              ) : (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={investmentSummary.actionItems[0]?.kind === "overdue"
                    ? { backgroundColor: theme.palette.error.light, color: theme.palette.error.dark }
                    : { backgroundColor: theme.palette.warning.light, color: theme.palette.warning.dark }}
                >
                  ⚠ {investmentSummary.actionItemsTotalCount} need
                  {investmentSummary.actionItemsTotalCount === 1 ? "s" : ""}{" "}
                  attention
                </span>
              )}
            </div>
            {investmentSummary.actionItems.length > 0 ? (
              <div className="space-y-2">
                {investmentSummary.actionItems.map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                    style={{ backgroundColor: theme.palette.background.paper }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold" style={{ color: theme.palette.text.primary }}>
                        {item.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={item.kind === "overdue"
                            ? { backgroundColor: theme.palette.error.light, color: theme.palette.error.dark }
                            : item.kind === "due"
                              ? { backgroundColor: theme.palette.warning.light, color: theme.palette.warning.dark }
                              : { backgroundColor: theme.palette.info.light, color: theme.palette.info.dark }}
                        >
                          {ACTION_TAG_LABELS[item.kind]}
                        </span>
                        <span className="text-[10px]" style={{ color: theme.palette.text.secondary }}>
                          {formatShortDate(item.date)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: item.kind === "overdue" ? theme.palette.error.main : theme.palette.text.primary }}
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
                    className="text-[11px] font-semibold transition"
                    style={{ color: theme.palette.primary.main }}
                  >
                    +
                    {investmentSummary.actionItemsTotalCount -
                      investmentSummary.actionItems.length}{" "}
                    more →
                  </button>
                )}
              </div>
            ) : (
              <div className="py-3 text-center text-xs" style={{ color: theme.palette.text.secondary }}>
                No contributions or maturities need attention
              </div>
            )}
            {investmentSummary.staleValuationCount > 0 && (
              <div className="mt-2.5 flex items-center justify-between border-t pt-2 text-[11px]" style={{ borderColor: theme.palette.divider }}>
                <span className="font-medium" style={{ color: theme.palette.text.secondary }}>Valuation alert</span>
                <button
                  type="button"
                  onClick={onOpenInvestments}
                  className="font-semibold transition"
                  style={{ color: theme.palette.warning.dark }}
                >
                  {investmentSummary.staleValuationCount} holding
                  {investmentSummary.staleValuationCount === 1 ? "" : "s"}{" "}
                  unvalued 90+ days →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: theme.palette.divider }}>
          <span className="font-semibold" style={{ color: theme.palette.text.primary }}>
            {investmentSummary.activeCount}
          </span>
          <span className="ml-1" style={{ color: theme.palette.text.secondary }}>
            active investments tracked
          </span>
          {investmentSummary.insuranceCover > 0 && (
            <span className="ml-2" style={{ color: theme.palette.text.secondary }}>
              · {formatCurrency(investmentSummary.insuranceCover)} insured
            </span>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
