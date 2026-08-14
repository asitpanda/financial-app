// @ts-nocheck
/** @typedef {import('../types/investment.types').InvestmentDrawerData} InvestmentDrawerData */
import React from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  mdiCalendarBlankOutline,
  mdiCalendarClock,
  mdiCalendarEnd,
  mdiCalendarStart,
  mdiCash,
  mdiDeleteOutline,
  mdiPauseCircleOutline,
  mdiPencilOutline,
  mdiPlayCircleOutline,
  mdiPlus,
  mdiRepeat,
  mdiTrendingUp,
} from "@mdi/js";
import Icon from "@mdi/react";
import dayjs from "dayjs";
import AppDrawer from "../../../components/drawers/AppDrawer";
import AppButton from "../../../components/common/AppButton";
import ConfirmDialog from "../../../components/dialogs/ConfirmDialog";
import { EmptyState, SectionCard, StatusChip } from "../../../components/common";
import DataTable from "../../../components/common/DataTable";
import RecordValuationModal from "./RecordValuationModal";
import { useUpdateInvestmentContributionPlan } from "../hooks/useContributionPlans";
import { useDeleteInvestmentSnapshot } from "../hooks/useInvestmentSnapshots";
import { INVESTMENT_EVENT_TYPES } from "../../../types/investmentEventTypes";
import { useNotificationStore } from "../../../store/notificationStore";
import { getRuntimeErrorMessage } from "../../../utils/errorMessage";
import {
  formatInvestmentCurrency,
  formatInvestmentDate,
  getInvestmentCategoryLabel,
  getInvestmentStatusTone,
} from "../../../utils/investmentHelpers";

const DRAWER_TABS = ["overview", "contribution", "valuation", "details"];
const VALUATION_STALE_DAYS = 30;
const PERIOD_OPTIONS = ["3M", "6M", "1Y", "ALL"];
const CONTRIBUTION_FILTER_OPTIONS = ["all", "contributions", "withdrawals", "other"];

function formatCodeLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValueOrDash(value, formatter) {
  if (value == null || value === "") {
    return "—";
  }

  return formatter ? formatter(value) : value;
}

function formatDateOrDash(value) {
  if (!value) return "—";
  const formatted = formatInvestmentDate(value);
  return formatted === "Not set" ? "—" : formatted;
}

function getContributionEventLabel(eventType) {
  switch (eventType) {
    case INVESTMENT_EVENT_TYPES.CONTRIBUTION:
      return "Contribution";
    case INVESTMENT_EVENT_TYPES.OPENING_BALANCE:
      return "Opening Balance";
    case INVESTMENT_EVENT_TYPES.OPENING_INCOME_CREDIT:
      return "Opening Income";
    case INVESTMENT_EVENT_TYPES.WITHDRAWAL_PRINCIPAL:
      return "Principal Withdrawal";
    default:
      return formatCodeLabel(eventType || "Activity");
  }
}

function getContributionAmount(event) {
  const amount = Number(event?.amount || event?.netAmount || 0);
  return event?.eventType === INVESTMENT_EVENT_TYPES.WITHDRAWAL_PRINCIPAL
    ? -Math.abs(amount)
    : amount;
}

function getContributionSourceLabel(event) {
  if (event?.recurringPlanId != null) {
    return "Recurring Plan";
  }

  if (event?.eventSource) {
    return formatCodeLabel(event.eventSource);
  }

  return "Manual";
}

function getContributionCadenceLabel(plan) {
  if (!plan) return "—";
  const interval = Number(plan.cadenceInterval || 1);
  const unit = String(plan.cadenceUnit || "").toLowerCase();

  if (!unit) return "—";
  if (interval > 1) {
    return `Every ${interval} ${unit}`;
  }

  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

function getContributionAmountSummary(plan) {
  if (!plan) return "—";

  const interval = Number(plan.cadenceInterval || 1);
  const unit = String(plan.cadenceUnit || "").toLowerCase();
  const cadenceSuffix = unit ? (interval > 1 ? `${interval} ${unit}` : unit) : "period";

  return `${formatInvestmentCurrency(plan.amount)} / ${cadenceSuffix}`;
}

function isContributionLike(eventType) {
  return [
    INVESTMENT_EVENT_TYPES.CONTRIBUTION,
    INVESTMENT_EVENT_TYPES.OPENING_BALANCE,
    INVESTMENT_EVENT_TYPES.OPENING_INCOME_CREDIT,
  ].includes(eventType);
}

function isWithdrawalLike(eventType) {
  return eventType === INVESTMENT_EVENT_TYPES.WITHDRAWAL_PRINCIPAL;
}

function getStatusChipColor(statusLabel) {
  const normalized = String(statusLabel || "").toLowerCase();

  if (["confirmed", "active"].includes(normalized)) return "success";
  if (["pending", "expected"].includes(normalized)) return "warning";
  if (["failed", "cancelled", "skipped", "closed"].includes(normalized)) {
    return "default";
  }

  return "default";
}

function getFreshnessMeta(latestSnapshot, lastValuationAt) {
  const dateValue = latestSnapshot?.snapshotDate || lastValuationAt || null;
  if (!dateValue) {
    return { label: "No valuation recorded", stale: true };
  }

  const valuationDate = dayjs(dateValue);
  const stale = dayjs().diff(valuationDate, "day") > VALUATION_STALE_DAYS;

  return {
    label: `Valued ${valuationDate.format("DD MMM YYYY")}`,
    stale,
  };
}

function getPeriodStartDate(period, points) {
  if (period === "ALL" || points.length === 0) return null;

  const latestPoint = dayjs(points[points.length - 1]?.date);
  if (!latestPoint.isValid()) return null;

  if (period === "3M") return latestPoint.subtract(3, "month");
  if (period === "6M") return latestPoint.subtract(6, "month");
  if (period === "1Y") return latestPoint.subtract(1, "year");
  return null;
}

function SectionBlock({ title, helperText, action, children, grow = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: grow ? 0 : "auto",
        flex: grow ? 1 : "initial",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.1 }}>
            {title}
          </Typography>
          {helperText ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {helperText}
            </Typography>
          ) : null}
        </Box>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Box>
      {children}
    </Box>
  );
}

function MetricStat({ label, value, subtext, valueColor = "text.primary", subtle = false }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        px: 1.75,
        py: 1.5,
        borderRadius: 2,
        bgcolor: subtle ? "rgba(248, 250, 252, 0.8)" : "rgba(255, 255, 255, 0.9)",
        border: subtle
          ? "1px solid rgba(226, 232, 240, 0.95)"
          : "1px solid rgba(226, 232, 240, 0.72)",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: valueColor, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {subtext ? (
        <Typography
          variant="caption"
          color={subtle ? "warning.main" : "text.secondary"}
          sx={{ display: "block", mt: 0.75 }}
        >
          {subtext}
        </Typography>
      ) : null}
    </Box>
  );
}

function MetadataGrid({
  items,
  columns = {
    xs: "1fr",
    sm: "repeat(2, minmax(0, 1fr))",
    lg: "repeat(3, minmax(0, 1fr))",
  },
}) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "grid",
        gridTemplateColumns: columns,
        columnGap: 1.5,
        rowGap: 0.65,
      }}
    >
      {items.map((item) => (
        <Typography
          key={item.label}
          component="div"
          variant="body2"
          sx={{
            minWidth: 0,
            lineHeight: 1.45,
          }}
        >
          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {item.label}:
          </Typography>{" "}
          <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: "text.primary", wordBreak: "break-word" }}>
            {item.value}
          </Typography>
        </Typography>
      ))}
    </Box>
  );
}

function CompactKeyValue({ label, value, emphasize = false, valueColor = "text.primary" }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600, mb: 0.35 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: emphasize ? 700 : 600, color: valueColor }}>
        {value}
      </Typography>
    </Box>
  );
}

function InvestmentPerformanceChart({ points, formatValue }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  if (points.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
        No historical performance data available yet
      </Typography>
    );
  }

  const chartData = points.map((point) => ({
    ...point,
    label: dayjs(point.date).format("MMM YY"),
  }));
  const maxValue = Math.max(
    ...chartData.map((item) => Math.max(item.currentValue, item.investedValue)),
  );
  const minValue = Math.min(
    ...chartData.map((item) => Math.min(item.currentValue, item.investedValue)),
    0,
  );
  const range = maxValue - minValue;
  const padding = { top: 18, right: 24, bottom: 34, left: 70 };
  const dataPointWidth = (() => {
    if (chartData.length > 200) return 8;
    if (chartData.length > 120) return 10;
    if (chartData.length > 60) return 12;
    if (chartData.length > 24) return 15;
    return 22;
  })();
  const chartWidth = Math.max(620, chartData.length * dataPointWidth);
  const chartHeight = 236;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const plottedPoints = chartData.map((item, idx) => {
    const x = padding.left + (idx / Math.max(chartData.length - 1, 1)) * plotWidth;
    const yInvestedValue =
      padding.top +
      plotHeight -
      ((item.investedValue - minValue) / Math.max(range, 1)) * plotHeight;
    const yCurrentValue =
      padding.top +
      plotHeight -
      ((item.currentValue - minValue) / Math.max(range, 1)) * plotHeight;
    return { x, yInvestedValue, yCurrentValue, ...item };
  });

  const dotFrequency = Math.max(1, Math.ceil(chartData.length / 25));
  const showDots = plottedPoints.map(
    (_, idx) => idx % dotFrequency === 0 || idx === plottedPoints.length - 1,
  );
  const currentLine = plottedPoints
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.yCurrentValue}`)
    .join(" ");
  const investedLine = plottedPoints
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.yInvestedValue}`)
    .join(" ");

  return (
    <Box sx={{ width: "100%", overflow: "hidden", px: 0, py: 0.5, borderRadius: 2, bgcolor: "rgba(248, 250, 252, 0.72)" }}>
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke="#d1d5db" strokeWidth="1" />
        <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#d1d5db" strokeWidth="1" />

        {Array.from({ length: 5 }).map((_, idx) => {
          const ratio = idx / 4;
          const y = padding.top + plotHeight - ratio * plotHeight;
          const value = minValue + ratio * range;
          return (
            <g key={`grid-${idx}`}>
              <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2" />
              <text x={padding.left - 8} y={y} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 12, fill: "#6b7280" }}>
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        {plottedPoints.map((point, idx) => {
          const labelFrequency = Math.max(1, Math.ceil(chartData.length / 10));
          if (idx % labelFrequency !== 0 && idx !== plottedPoints.length - 1) {
            return null;
          }

          return (
            <text key={`label-${idx}`} x={point.x} y={chartHeight - padding.bottom + 15} textAnchor="middle" style={{ fontSize: chartData.length > 100 ? 9 : 10, fill: "#6b7280" }}>
              {point.label}
            </text>
          );
        })}

        <path d={investedLine} fill="none" stroke="#f59e0b" strokeWidth="2" />
        <path d={currentLine} fill="none" stroke="#2563eb" strokeWidth="2.5" />

        {plottedPoints.map((point, pointIdx) => {
          const tooltipWidth = 200;
          const tooltipHeight = 96;
          let tooltipX = point.x - tooltipWidth / 2;
          let tooltipY = point.yCurrentValue - tooltipHeight - 10;

          if (tooltipX < padding.left) tooltipX = padding.left + 5;
          if (tooltipX + tooltipWidth > chartWidth - padding.right) {
            tooltipX = chartWidth - padding.right - tooltipWidth - 5;
          }
          if (tooltipY < padding.top) tooltipY = point.yCurrentValue + 10;

          return (
            <g key={`point-${pointIdx}`}>
              {showDots[pointIdx] ? (
                <>
                  <circle cx={point.x} cy={point.yCurrentValue} r={hoveredIndex === pointIdx ? 5 : 3} fill="#2563eb" opacity={hoveredIndex === pointIdx ? 1 : 0.7} style={{ cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={() => setHoveredIndex(pointIdx)} onMouseLeave={() => setHoveredIndex(null)} />
                  <circle cx={point.x} cy={point.yInvestedValue} r={hoveredIndex === pointIdx ? 4.5 : 2.5} fill="#f59e0b" opacity={hoveredIndex === pointIdx ? 1 : 0.6} style={{ cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={() => setHoveredIndex(pointIdx)} onMouseLeave={() => setHoveredIndex(null)} />
                </>
              ) : null}

              {hoveredIndex === pointIdx ? (
                <g>
                  <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" fill="#1f2937" opacity="0.96" />
                  <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 15} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: "#fff" }}>
                    {dayjs(point.date).format("DD MMM YYYY")}
                  </text>
                  <text x={tooltipX + 10} y={tooltipY + 42} style={{ fontSize: 11, fill: "#e5e7eb" }}>Current Value</text>
                  <text x={tooltipX + tooltipWidth - 10} y={tooltipY + 42} textAnchor="end" style={{ fontSize: 11, fill: "#60a5fa", fontWeight: 700 }}>{formatValue(point.currentValue)}</text>
                  <text x={tooltipX + 10} y={tooltipY + 58} style={{ fontSize: 11, fill: "#e5e7eb" }}>Total Invested</text>
                  <text x={tooltipX + tooltipWidth - 10} y={tooltipY + 58} textAnchor="end" style={{ fontSize: 11, fill: "#fcd34d", fontWeight: 700 }}>{formatValue(point.investedValue)}</text>
                  <text x={tooltipX + 10} y={tooltipY + 74} style={{ fontSize: 11, fill: "#e5e7eb" }}>Return</text>
                  <text x={tooltipX + tooltipWidth - 10} y={tooltipY + 74} textAnchor="end" style={{ fontSize: 11, fill: point.gainLossValue >= 0 ? "#34d399" : "#f87171", fontWeight: 700 }}>
                    {point.gainLossValue >= 0 ? "+" : ""}
                    {formatValue(point.gainLossValue)} ({point.gainLossPercentage >= 0 ? "+" : ""}
                    {point.gainLossPercentage.toFixed(2)}%)
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>

    </Box>
  );
}

export default InvestmentViewDrawer;

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   investment: InvestmentDrawerData | null,
 *   taxonomyNodes?: unknown[],
 *   onEdit?: (investment: InvestmentDrawerData) => void,
 * }} props
 */
export function InvestmentViewDrawer({
  open,
  onClose,
  investment,
  taxonomyNodes = [],
  onEdit,
}) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [contributionFilter, setContributionFilter] = React.useState("all");
  const [contributionStatusFilter, setContributionStatusFilter] = React.useState("all");
  const [contributionSourceFilter, setContributionSourceFilter] = React.useState("all");
  const [valuationPeriod, setValuationPeriod] = React.useState("ALL");
  const [recordValuationOpen, setRecordValuationOpen] = React.useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = React.useState(null);
  const [deleteSnapshotTarget, setDeleteSnapshotTarget] = React.useState(null);
  const [snapshotActionLoading, setSnapshotActionLoading] = React.useState(false);
  const [planActionLoading, setPlanActionLoading] = React.useState(false);
  const [planActionError, setPlanActionError] = React.useState("");
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const updateContributionPlanMutation = useUpdateInvestmentContributionPlan();
  const deleteSnapshotMutation = useDeleteInvestmentSnapshot();

  React.useEffect(() => {
    if (!open) return;
    setPlanActionError("");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setActiveTab("overview");
    setContributionFilter("all");
    setContributionStatusFilter("all");
    setContributionSourceFilter("all");
    setValuationPeriod("ALL");
  }, [open, investment?.id]);

  const handleOpenCreateSnapshot = () => {
    setSelectedSnapshot(null);
    setRecordValuationOpen(true);
  };

  const handleOpenEditSnapshot = (snapshot) => {
    setSelectedSnapshot(snapshot);
    setRecordValuationOpen(true);
  };

  const handleCloseSnapshotModal = () => {
    setRecordValuationOpen(false);
    setSelectedSnapshot(null);
  };

  const footer = (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
      <AppButton variant="outlined" onClick={onClose} sx={{ minWidth: 120 }}>
        Close
      </AppButton>
      {investment ? (
        <AppButton variant="contained" onClick={() => onEdit?.(investment)} sx={{ minWidth: 160 }}>
          Edit Investment
        </AppButton>
      ) : null}
    </Box>
  );

  const handlePlanUpdate = async (payload, successMessage) => {
    const planId = investment?.activeContributionPlan?.id;
    if (!investment?.id || !planId) return;

    setPlanActionLoading(true);
    setPlanActionError("");
    try {
      await updateContributionPlanMutation.mutateAsync({
        investmentId: investment.id,
        planId,
        payload,
      });
      pushNotification({
        type: "success",
        message: successMessage,
      });
    } catch (error) {
      const message = getRuntimeErrorMessage(error, "Failed to update recurring plan");
      setPlanActionError(message);
      pushNotification({
        type: "error",
        message,
      });
    } finally {
      setPlanActionLoading(false);
    }
  };


  const handlePausePlan = () => handlePlanUpdate({ status: "paused" }, "Recurring plan paused");
  const handleResumePlan = () => handlePlanUpdate({ status: "active" }, "Recurring plan resumed");

  const handleDeleteSnapshot = async () => {
    if (!deleteSnapshotTarget?.id || !investment?.id) return;

    setSnapshotActionLoading(true);
    try {
      await deleteSnapshotMutation.mutateAsync({
        snapshotId: deleteSnapshotTarget.id,
        investmentId: investment.id,
      });
      pushNotification({
        type: "success",
        message: `Deleted valuation for ${formatInvestmentDate(deleteSnapshotTarget.snapshotDate)}`,
      });
      setDeleteSnapshotTarget(null);
    } catch (error) {
      pushNotification({
        type: "error",
        message: getRuntimeErrorMessage(error, "Failed to delete valuation"),
      });
    } finally {
      setSnapshotActionLoading(false);
    }
  };

  const valuationSnapshots = React.useMemo(() => {
    if (!Array.isArray(investment?.valuationSnapshots)) {
      return [];
    }

    return [...investment.valuationSnapshots].sort(
      (left, right) => new Date(right.snapshotDate).getTime() - new Date(left.snapshotDate).getTime(),
    );
  }, [investment?.valuationSnapshots]);

  const activityEvents = React.useMemo(() => {
    if (!Array.isArray(investment?.investmentEvents)) {
      return [];
    }

    return [...investment.investmentEvents].sort((left, right) => {
      const leftDate = new Date(left.eventDate || left.dueDate || 0).getTime();
      const rightDate = new Date(right.eventDate || right.dueDate || 0).getTime();
      return rightDate - leftDate;
    });
  }, [investment?.investmentEvents]);

  const performanceHistoryData = React.useMemo(() => {
    const base = Array.isArray(investment?.performanceHistory) ? investment.performanceHistory : [];
    const sorted = [...base].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
    const periodStart = getPeriodStartDate(valuationPeriod, sorted);

    if (!periodStart) {
      return sorted;
    }

    const filtered = sorted.filter(
      (point) => dayjs(point.date).isAfter(periodStart) || dayjs(point.date).isSame(periodStart, "day"),
    );
    return filtered.length > 1 ? filtered : sorted;
  }, [investment?.performanceHistory, valuationPeriod]);

  const latestSnapshot = valuationSnapshots[0] ?? investment?.latestSnapshot ?? null;
  const effectiveCurrentValue = Number(investment?.currentValue ?? investment?.totalInvested ?? 0);
  const effectiveTotalInvested = Number(investment?.totalInvested ?? 0);
  const totalReturnValue = effectiveCurrentValue - effectiveTotalInvested;
  const totalReturnPercentage =
    effectiveTotalInvested > 0 ? (totalReturnValue / effectiveTotalInvested) * 100 : 0;
  const totalReturnColor = totalReturnValue >= 0 ? "success.main" : "error.main";
  const freshnessMeta = getFreshnessMeta(latestSnapshot, investment?.lastValuationAt);
  const recurringPlanStatus = String(investment?.activeContributionPlan?.status || "active").toLowerCase();
  const categoryLabel = getInvestmentCategoryLabel(
    investment?.category || investment?.assetCategory,
    taxonomyNodes,
  );
  const institutionLabel = investment?.institution || investment?.institutionName || "—";
  const holdingMode = investment?.contributionMode ? formatCodeLabel(investment.contributionMode) : "—";
  const sourceLabel = investment?.currentValueSource ? formatCodeLabel(investment.currentValueSource) : "—";
  const statusOptions = React.useMemo(() => {
    const uniqueStatuses = Array.from(
      new Set(
        activityEvents
          .map((event) => String(event.status || "recorded").toLowerCase())
          .filter(Boolean),
      ),
    );
    return ["all", ...uniqueStatuses];
  }, [activityEvents]);

  const sourceOptions = React.useMemo(() => {
    const sources = Array.from(new Set(activityEvents.map((e) => getContributionSourceLabel(e))));
    return ["all", ...sources];
  }, [activityEvents]);

  const contributionFilterCounts = React.useMemo(() => ({
    all: activityEvents.length,
    contributions: activityEvents.filter((e) => isContributionLike(e.eventType)).length,
    withdrawals: activityEvents.filter((e) => isWithdrawalLike(e.eventType)).length,
    other: activityEvents.filter((e) => !isContributionLike(e.eventType) && !isWithdrawalLike(e.eventType)).length,
  }), [activityEvents]);

  const filteredContributionEvents = React.useMemo(() => {
    return activityEvents.filter((event) => {
      const eventStatus = String(event.status || "recorded").toLowerCase();
      const eventSource = getContributionSourceLabel(event);

      if (contributionFilter === "contributions" && !isContributionLike(event.eventType)) return false;
      if (contributionFilter === "withdrawals" && !isWithdrawalLike(event.eventType)) return false;
      if (contributionFilter === "other" && (isContributionLike(event.eventType) || isWithdrawalLike(event.eventType))) return false;
      if (contributionStatusFilter !== "all" && eventStatus !== contributionStatusFilter) return false;
      if (contributionSourceFilter !== "all" && eventSource !== contributionSourceFilter) return false;

      return true;
    });
  }, [activityEvents, contributionFilter, contributionStatusFilter, contributionSourceFilter]);

  const contributionRows = filteredContributionEvents.map((event) => {
    const signedAmount = getContributionAmount(event);
    const status = String(event.status || "recorded").toLowerCase();
    return {
      id: event.id,
      date: event.eventDate || event.dueDate,
      activity: getContributionEventLabel(event.eventType),
      amount: signedAmount,
      status,
      source: getContributionSourceLabel(event),
      notes: event.notes || "—",
      linkedTransactionId: event.linkedTransactionId,
      dueDate: event.dueDate,
    };
  });

  const contributionColumns = [
    {
      field: "date",
      headerName: "Date",
      flex: 1.05,
      minWidth: 132,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatDateOrDash(row.date)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.date ? dayjs(row.date).format("ddd") : "—"}
          </Typography>
        </Box>
      ),
    },
    { field: "activity", headerName: "Contribution", flex: 1.2, minWidth: 160 },
    {
      field: "amount",
      headerName: "Amount",
      flex: 0.9,
      minWidth: 130,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: value >= 0 ? "success.main" : "error.main" }}>
          {value >= 0 ? "+" : ""}
          {formatInvestmentCurrency(value)}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 120,
      renderCell: ({ value }) => (
        <Chip size="small" label={formatCodeLabel(value)} color={getStatusChipColor(value)} sx={{ fontWeight: 600 }} />
      ),
    },
    { field: "source", headerName: "Source", flex: 1, minWidth: 140 },
    {
      field: "linkedTransactionId",
      headerName: "Linked Transaction",
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) =>
        value ? (
          <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
            TXN-{value}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">—</Typography>
        ),
    },
    {
      field: "dueDate",
      headerName: "Due Date",
      flex: 1,
      minWidth: 130,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatDateOrDash(value)}
        </Typography>
      ),
    },
    { field: "notes", headerName: "Notes", flex: 1.4, minWidth: 190 },
  ];

  const valuationRows = valuationSnapshots.map((snapshot) => ({
    id: snapshot.id,
    snapshotDate: snapshot.snapshotDate,
    marketValue: snapshot.marketValue,
    units: snapshot.units,
    price: snapshot.price,
    source: snapshot.source,
    snapshot,
  }));

  const valuationColumns = [
    {
      field: "snapshotDate",
      headerName: "Valuation Date",
      flex: 1.05,
      minWidth: 150,
      renderCell: ({ row }) => (
        <Box sx={{ py: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatDateOrDash(row.snapshotDate)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.snapshotDate ? dayjs(row.snapshotDate).format("ddd") : "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "marketValue",
      headerName: "Market Value",
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatInvestmentCurrency(value)}
        </Typography>
      ),
    },
    {
      field: "units",
      headerName: "Units",
      flex: 0.8,
      minWidth: 110,
      renderCell: ({ value }) => <Typography variant="body2">{value ?? "—"}</Typography>,
    },
    {
      field: "price",
      headerName: "Price",
      flex: 0.9,
      minWidth: 130,
      renderCell: ({ value }) => <Typography variant="body2">{value != null ? formatInvestmentCurrency(value) : "—"}</Typography>,
    },
    {
      field: "source",
      headerName: "Source",
      flex: 0.9,
      minWidth: 130,
      renderCell: ({ value }) => <Chip size="small" variant="outlined" label={value ? formatCodeLabel(value) : "Manual"} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      align: "right",
      headerAlign: "right",
      minWidth: 116,
      renderCell: ({ row }) => (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleOpenEditSnapshot(row.snapshot)} aria-label={`Edit valuation on ${formatInvestmentDate(row.snapshotDate)}`}>
            <Icon path={mdiPencilOutline} size={0.8} />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteSnapshotTarget(row.snapshot)} aria-label={`Delete valuation on ${formatInvestmentDate(row.snapshotDate)}`}>
            <Icon path={mdiDeleteOutline} size={0.8} />
          </IconButton>
        </Box>
      ),
    },
  ];

  const renderOverviewTab = () => {
    const planStatus = formatCodeLabel(investment?.activeContributionPlan?.status || "active");
    const planStatusNormalized = String(investment?.activeContributionPlan?.status || "active").toLowerCase();
    const latestValuationAmount = latestSnapshot
      ? formatInvestmentCurrency(latestSnapshot.marketValue ?? effectiveCurrentValue)
      : "—";
    const contributionHeadlineAmount = investment?.activeContributionPlan
      ? formatInvestmentCurrency(investment.activeContributionPlan.amount)
      : "—";
    const contributionHeadlineCadence = investment?.activeContributionPlan
      ? (() => {
          const interval = Number(investment.activeContributionPlan.cadenceInterval || 1);
          const unit = String(investment.activeContributionPlan.cadenceUnit || "").toLowerCase();
          if (!unit) return "period";
          return interval > 1 ? `${interval} ${unit}` : unit;
        })()
      : "period";

    const atGlanceItems = [
      { label: "Institution", value: institutionLabel },
      { label: "Start Date", value: formatDateOrDash(investment?.startDate) },
      { label: "Holding Mode", value: holdingMode },
      { label: "Asset Category", value: categoryLabel || "—" },
      { label: "Maturity Date", value: formatDateOrDash(investment?.maturityDate) },
      { label: "Reference Number", value: formatValueOrDash(investment?.referenceNumber) },
      { label: "Asset Type", value: investment?.type || investment?.assetType || "—" },
      { label: "Insurance Cover", value: formatValueOrDash(investment?.insuranceCover, formatInvestmentCurrency) },
      { label: "Status", value: formatCodeLabel(investment?.status || "—") },
    ];
    const atGlanceColumns = [
      [atGlanceItems[0], atGlanceItems[3], atGlanceItems[6]],
      [atGlanceItems[1], atGlanceItems[4], atGlanceItems[7]],
      [atGlanceItems[2], atGlanceItems[5], atGlanceItems[8]],
    ];

    return (
      <Stack spacing={2} sx={{ pb: 0.5 }}>
        <SectionCard title="At a glance">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
              columnGap: 0,
            }}
          >
            {atGlanceColumns.map((columnItems, columnIndex) => (
              <Box
                key={`at-glance-column-${columnIndex}`}
                sx={(theme) => ({
                  minWidth: 0,
                  px: { xs: 0, md: 1.75 },
                  borderLeft:
                    columnIndex > 0 ? `1px solid ${theme.palette.divider}` : "none",
                  [theme.breakpoints.down("md")]: {
                    borderLeft: "none",
                  },
                })}
              >
                <Stack spacing={1.2}>
                  {columnItems.map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        minWidth: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.25,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontWeight: 500,
                          lineHeight: 1.45,
                          letterSpacing: 0.1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.45,
                          color: "text.primary",
                          textAlign: "right",
                          minWidth: 0,
                          wordBreak: "break-word",
                        }}
                      >
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        </SectionCard>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          <SectionCard
            title={
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8 }}>
                <Icon path={mdiCalendarBlankOutline} size={0.8} color="#d97706" />
                <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Contribution Plan
                </Typography>
              </Box>
            }
            action={
              investment?.activeContributionPlan ? (
                <Chip
                  size="small"
                  label={planStatus}
                  color={planStatusNormalized === "active" ? "success" : planStatusNormalized === "paused" ? "warning" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 700, height: 22 }}
                />
              ) : null
            }
          >
            {investment?.activeContributionPlan ? (
              <Stack spacing={1.2}>
                <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {contributionHeadlineAmount}
                  <Typography
                    component="span"
                    sx={{
                      ml: 0.4,
                      fontWeight: 600,
                      fontSize: "0.68em",
                      color: "text.secondary",
                    }}
                  >
                    / {contributionHeadlineCadence}
                  </Typography>
                </Typography>

                <Box sx={{ display: "grid", rowGap: 0.8 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      Next due
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      {formatDateOrDash(investment.activeContributionPlan.nextDueDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      Start / Anchor date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      {formatDateOrDash(investment.activeContributionPlan.anchorDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      End date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      {formatDateOrDash(investment.activeContributionPlan.endDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      Reminder
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      —
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Not configured
              </Typography>
            )}
          </SectionCard>

          <SectionCard
            title={
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8 }}>
                <Icon path={mdiTrendingUp} size={0.8} color="#2563eb" />
                <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Latest Valuation
                </Typography>
              </Box>
            }
          >
            {latestSnapshot ? (
              <Stack spacing={1.2}>
                <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {latestValuationAmount}
                </Typography>

                <Box sx={{ display: "grid", rowGap: 0.8 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      Valuation Date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      {formatDateOrDash(latestSnapshot.snapshotDate || investment?.lastValuationAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      Source
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      {latestSnapshot.source ? formatCodeLabel(latestSnapshot.source) : sourceLabel}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      Units
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      {formatValueOrDash(latestSnapshot.units)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                      Price
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                      {latestSnapshot.price != null ? formatInvestmentCurrency(latestSnapshot.price) : "—"}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                No valuation history
              </Typography>
            )}
          </SectionCard>
        </Box>
      </Stack>
    );
  };

  const renderContributionTab = () => {
    const planStatusNormalized = String(investment?.activeContributionPlan?.status || "active").toLowerCase();
    const planStatusLabel = formatCodeLabel(investment?.activeContributionPlan?.status || "active");
    const normalizedContributionMode = String(investment?.contributionMode || "").trim().toUpperCase();
    const isRecurringContributionType =
      normalizedContributionMode === "RECURRING" || Boolean(investment?.activeContributionPlan?.id);

    const filterOptions = [
      { key: "all", label: `All (${contributionFilterCounts.all})` },
      { key: "contributions", label: `Contributions (${contributionFilterCounts.contributions})` },
      { key: "withdrawals", label: `Withdrawals (${contributionFilterCounts.withdrawals})` },
      { key: "other", label: `Other (${contributionFilterCounts.other})` },
    ];

    return (
      <Stack spacing={0} sx={{ height: "100%", minHeight: 0 }}>
        {investment?.activeContributionPlan ? (
          <SectionCard
            title={
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                Contribution Plan
                <Chip
                  size="small"
                  label={planStatusLabel}
                  color={planStatusNormalized === "active" ? "success" : planStatusNormalized === "paused" ? "warning" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 700, height: 22 }}
                />
              </Box>
            }
            action={
              isRecurringContributionType ? (
                planStatusNormalized === "paused" ? (
                  <AppButton
                    size="small"
                    variant="outlined"
                    onClick={handleResumePlan}
                    disabled={planActionLoading}
                  >
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                      <Icon path={mdiPlayCircleOutline} size={0.72} />
                      Resume Plan
                    </Box>
                  </AppButton>
                ) : (
                  <AppButton
                    size="small"
                    variant="outlined"
                    onClick={handlePausePlan}
                    disabled={planActionLoading}
                  >
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                      <Icon path={mdiPauseCircleOutline} size={0.72} />
                      Pause Plan
                    </Box>
                  </AppButton>
                )
              ) : null
            }
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", overflowX: "auto" }}>
              {[
                {
                  icon: mdiCash,
                  label: "Contribution Amount",
                  value: formatInvestmentCurrency(investment.activeContributionPlan.amount),
                },
                {
                  icon: mdiRepeat,
                  label: "Cadence",
                  value: getContributionCadenceLabel(investment.activeContributionPlan),
                },
                {
                  icon: mdiCalendarClock,
                  label: "Next Due Date",
                  value: formatDateOrDash(investment.activeContributionPlan.nextDueDate),
                },
                {
                  icon: mdiCalendarStart,
                  label: "Anchor / Start Date",
                  value: formatDateOrDash(investment.activeContributionPlan.anchorDate),
                },
                {
                  icon: mdiCalendarEnd,
                  label: "End Date",
                  value: formatDateOrDash(investment.activeContributionPlan.endDate),
                },
              ].map((field, idx) => (
                <Box
                  key={field.label}
                  sx={(theme) => ({
                    flex: 1,
                    minWidth: 110,
                    px: 1.75,
                    borderLeft: idx > 0 ? `1px solid ${theme.palette.divider}` : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                  })}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    <Icon path={field.icon} size={0.72} color="#2563eb" />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, lineHeight: 1.45, letterSpacing: 0.1, whiteSpace: "nowrap" }}
                    >
                      {field.label}
                    </Typography>
                  </Box>
                  {typeof field.value === "string" ? (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.45 }}>
                      {field.value}
                    </Typography>
                  ) : (
                    field.value
                  )}
                </Box>
              ))}
              </Box>

              {planActionError ? <Alert severity="error">{planActionError}</Alert> : null}
            </Stack>
          </SectionCard>
        ) : null}

        <SectionBlock
          grow
        >
          <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {(CONTRIBUTION_FILTER_OPTIONS.map((key) => ({
                  key,
                  label: filterOptions.find((option) => option.key === key)?.label || key,
                }))).map(({ key, label }) => (
                  <Chip
                    key={key}
                    label={label}
                    variant={contributionFilter === key ? "filled" : "outlined"}
                    color={contributionFilter === key ? "primary" : "default"}
                    onClick={() => setContributionFilter(key)}
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {statusOptions.length > 1 ? (
                  <Select
                    size="small"
                    value={contributionStatusFilter}
                    onChange={(e) => setContributionStatusFilter(e.target.value)}
                    sx={{ minWidth: 130 }}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>{s === "all" ? "All Status" : formatCodeLabel(s)}</MenuItem>
                    ))}
                  </Select>
                ) : null}
                {sourceOptions.length > 1 ? (
                  <Select
                    size="small"
                    value={contributionSourceFilter}
                    onChange={(e) => setContributionSourceFilter(e.target.value)}
                    sx={{ minWidth: 130 }}
                  >
                    {sourceOptions.map((s) => (
                      <MenuItem key={s} value={s}>{s === "all" ? "All Source" : s}</MenuItem>
                    ))}
                  </Select>
                ) : null}
              </Box>
            </Box>

            {contributionRows.length > 0 ? (
              <DataTable
                rows={contributionRows}
                columns={contributionColumns}
                disableColumnMenu
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                containerSx={{ height: "100%", minHeight: 320 }}
                sx={{
                  "& .MuiDataGrid-row": { minHeight: 58 },
                  "& .MuiDataGrid-cell": { py: 0.5, alignItems: "center" },
                }}
              />
            ) : (
              <Alert severity="info">No contributions match the current filters.</Alert>
            )}
          </Stack>
        </SectionBlock>
      </Stack>
    );
  };

  const renderValuationTab = () => {
    const valuationSummaryCards = [
      {
        label: "Last Valuation Date",
        value: formatDateOrDash(latestSnapshot?.snapshotDate || investment?.lastValuationAt),
        icon: mdiCalendarBlankOutline,
      },
      {
        label: "Market Value",
        value: formatInvestmentCurrency(latestSnapshot?.marketValue ?? effectiveCurrentValue),
        icon: mdiTrendingUp,
      },
      {
        label: "Source",
        value: latestSnapshot?.source ? formatCodeLabel(latestSnapshot.source) : sourceLabel,
        icon: mdiPencilOutline,
      },
      {
        label: "Units",
        value: formatValueOrDash(latestSnapshot?.units),
        icon: mdiRepeat,
      },
      {
        label: "Price",
        value: latestSnapshot?.price != null ? formatInvestmentCurrency(latestSnapshot.price) : "—",
        icon: mdiCash,
      },
    ];

    return (
      <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0, pb: 0.5 }}>
        <SectionCard
          title={
            <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
              Valuation Summary
            </Typography>
          }
          action={
            <AppButton size="small" variant="outlined" onClick={handleOpenCreateSnapshot} sx={{ minWidth: 138 }}>
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <Icon path={mdiPlus} size={0.85} />
                Record Valuation
              </Box>
            </AppButton>
          }
          contentSx={{ pt: 0 }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(5, minmax(0, 1fr))",
              },
            }}
          >
            {valuationSummaryCards.map((item, idx) => (
              <Box
                key={item.label}
                sx={(theme) => ({
                  flex: 1,
                  minWidth: 110,
                  px: 1.75,
                  borderLeft: idx > 0 ? `1px solid ${theme.palette.divider}` : "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  [theme.breakpoints.down("md")]: {
                    borderLeft: "none",
                  },
                })}
              >
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.55, mb: 0.25 }}>
                  <Icon path={item.icon} size={0.68} color="#2563eb" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500, lineHeight: 1.45, letterSpacing: 0.1, whiteSpace: "nowrap" }}
                  >
                    {item.label}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.25,
                    color: "text.primary",
                    wordBreak: "break-word",
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>

        <SectionCard
          title={
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.85, flexWrap: "wrap" }}>
              <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
                Performance Chart
              </Typography>
              <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                ({investment?.performanceHistorySource === "investment_event" ? "Investment Events" : "Valuation History"})
              </Typography>
            </Box>
          }
          action={
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {PERIOD_OPTIONS.map((period) => (
                <Chip
                  key={period}
                  size="small"
                  label={period}
                  variant={valuationPeriod === period ? "filled" : "outlined"}
                  color={valuationPeriod === period ? "primary" : "default"}
                  onClick={() => setValuationPeriod(period)}
                />
              ))}
            </Box>
          }
          contentSx={{ pt: 0 }}
        >
          {performanceHistoryData.length > 0 ? (
            <InvestmentPerformanceChart points={performanceHistoryData} formatValue={formatInvestmentCurrency} />
          ) : valuationSnapshots.length > 0 ? (
            <Alert severity="info">No chartable performance series is available yet for this period.</Alert>
          ) : (
            <EmptyState text="No valuation history yet" subText="Record the first valuation to start tracking value, profit, and growth over time." actionLabel="Record Valuation" onAction={handleOpenCreateSnapshot} />
          )}
        </SectionCard>

        <SectionBlock grow>
          {valuationRows.length > 0 ? (
            <DataTable
              rows={valuationRows}
              columns={valuationColumns}
              disableColumnMenu
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              containerSx={{ height: "100%", minHeight: 320 }}
              sx={{
                "& .MuiDataGrid-row": { minHeight: 58 },
                "& .MuiDataGrid-cell": { py: 0.5, alignItems: "center" },
              }}
            />
          ) : (
            <EmptyState text="No valuation history yet" subText="Record the first valuation to track market value over time." actionLabel="Record Valuation" onAction={handleOpenCreateSnapshot} />
          )}
        </SectionBlock>
      </Stack>
    );
  };

  const renderDetailsTab = () => (
    <Stack spacing={1.5} sx={{ pb: 0.5 }}>
      <SectionCard
        title={
          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
            Additional Information
          </Typography>
        }
        subTitle="Lower-frequency metadata and configuration."
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, minmax(0, 1fr))",
            },
            rowGap: 1,
            columnGap: 2,
          }}
        >
          {[
            { label: "Holding Mode", value: holdingMode },
            { label: "Reference Number", value: formatValueOrDash(investment?.referenceNumber) },
            { label: "Insurance Cover", value: formatValueOrDash(investment?.insuranceCover, formatInvestmentCurrency) },
            { label: "Currency", value: formatValueOrDash(investment?.currency) },
            { label: "Contribution Mode", value: holdingMode },
            { label: "External Reference", value: formatValueOrDash(investment?.externalReference) },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.25,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 0.1 }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right", color: "text.primary" }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </SectionCard>

      <SectionCard
        title={
          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notes
          </Typography>
        }
      >
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.6, color: investment?.notes ? "text.primary" : "text.secondary" }}>
          {investment?.notes || "No notes added."}
        </Typography>
      </SectionCard>
    </Stack>
  );

  const renderActiveTab = () => {
    if (!investment) return null;
    if (activeTab === "overview") return renderOverviewTab();
    if (activeTab === "contribution") return renderContributionTab();
    if (activeTab === "valuation") return renderValuationTab();
    return renderDetailsTab();
  };

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={investment ? `Investment View — ${investment.name}` : "Investment View"}
      titleExtra={investment ? <StatusChip label={investment.status} tone={getInvestmentStatusTone(investment.status)} /> : null}
      width="min(899px, 96vw)"
      footer={footer}
    >
      {!investment ? (
        <EmptyState text="Investment not found" subText="This investment no longer exists or the list changed." actionLabel="Close" onAction={onClose} />
      ) : (
        <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Box sx={{ px: { xs: 0, sm: 0.5 }, pb: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
              {[
                { label: "Current Value", value: formatInvestmentCurrency(effectiveCurrentValue) },
                { label: "Total Invested", value: formatInvestmentCurrency(effectiveTotalInvested) },
                { label: "Profit / Loss", value: `${totalReturnValue >= 0 ? "+" : ""}${formatInvestmentCurrency(totalReturnValue)}`, color: totalReturnColor },
                { label: "Return", value: effectiveTotalInvested > 0 ? `${totalReturnPercentage >= 0 ? "+" : ""}${totalReturnPercentage.toFixed(1)}%` : "—", color: totalReturnColor },
              ].map((metric) => (
                <Box key={metric.label} sx={{ minWidth: 0, px: 1.5, py: 1, borderRadius: 0.5, border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.2 }}>
                    {metric.label}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: metric.color || "text.primary", lineHeight: 1.3 }}>
                    {metric.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column"}}>
            <Tabs
              value={activeTab}
              onChange={(_event, value) => setActiveTab(value)}
              variant="scrollable"
              allowScrollButtonsMobile
              sx={{
                minHeight: 44,
                borderBottom: "1px solid",
                borderColor: "divider",
                "& .MuiTab-root": {
                  minHeight: 44,
                  px: 1.5,
                  textTransform: "none",
                  fontWeight: 600,
                },
              }}
            >
              <Tab value={DRAWER_TABS[0]} label="Overview" />
              <Tab value={DRAWER_TABS[1]} label="Contribution" />
              <Tab value={DRAWER_TABS[2]} label="Valuation" />
              <Tab value={DRAWER_TABS[3]} label="Details" />
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pt: 2.5 }}>
              {renderActiveTab()}
            </Box>
          </Box>
        </Box>
      )}

      <RecordValuationModal open={recordValuationOpen} onClose={handleCloseSnapshotModal} investmentId={investment?.id} investmentName={investment?.name} snapshot={selectedSnapshot} />

      <ConfirmDialog
        open={Boolean(deleteSnapshotTarget)}
        title="Delete valuation"
        description={deleteSnapshotTarget ? `Remove the valuation from ${formatInvestmentDate(deleteSnapshotTarget.snapshotDate)}? The investment current value will be recalculated from the latest remaining valuation.` : ""}
        confirmLabel="Delete"
        confirmColor="error"
        loading={snapshotActionLoading}
        onCancel={() => setDeleteSnapshotTarget(null)}
        onConfirm={handleDeleteSnapshot}
      />
    </AppDrawer>
  );
}
