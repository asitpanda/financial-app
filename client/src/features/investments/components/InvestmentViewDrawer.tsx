// @ts-nocheck
import React from "react";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { mdiDeleteOutline, mdiPencilOutline, mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";
import dayjs from "dayjs";
import AppDrawer from "../../../components/drawers/AppDrawer";
import AppButton from "../../../components/common/AppButton";
import ConfirmDialog from "../../../components/dialogs/ConfirmDialog";
import {
  EmptyState,
  SectionCard,
  StatusChip,
} from "../../../components/common";
import RecordValuationModal from "./RecordValuationModal";
import { updateContributionPlan } from "../api/contributionPlans.api";
import { deleteValuationSnapshot } from "../api/valuationSnapshots.api";
import { useNotificationStore } from "../../../store/notificationStore";
import { getRuntimeErrorMessage } from "../../../utils/errorMessage";
import {
  formatInvestmentCurrency,
  formatInvestmentDate,
  getInvestmentCategoryLabel,
  getInvestmentStatusTone,
} from "../../../utils/investmentHelpers";

function InvestmentPerformanceChart({ investment, formatValue }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  const performanceData = React.useMemo(() => {
    if (
      !investment.valuationSnapshots ||
      investment.valuationSnapshots.length === 0
    ) {
      return [];
    }

    // Sort by date and calculate cumulative contributions
    const sorted = [...investment.valuationSnapshots].sort(
      (a, b) => new Date(a.snapshotDate) - new Date(b.snapshotDate),
    );

    return sorted.map((snapshot) => {
      const currentValue = Number(snapshot.marketValue ?? 0);
      const investedValue = Number(investment.totalInvested ?? 0);
      const gainLossValue = currentValue - investedValue;
      const gainLossPercentage =
        investedValue > 0 ? (gainLossValue / investedValue) * 100 : 0;

      return {
        date: snapshot.snapshotDate,
        label: dayjs(snapshot.snapshotDate).format("MMM YY"),
        currentValue,
        investedValue,
        gainLossValue,
        gainLossPercentage,
      };
    });
  }, [investment.valuationSnapshots, investment.totalInvested]);

  if (performanceData.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
        No historical performance data available yet
      </Typography>
    );
  }

  const maxValue = Math.max(
    ...performanceData.map((d) => Math.max(d.currentValue, d.investedValue)),
  );
  const minValue = Math.min(
    ...performanceData.map((d) => Math.min(d.currentValue, d.investedValue)),
    0,
  );
  const range = maxValue - minValue;

  const padding = { top: 24, right: 24, bottom: 50, left: 70 };

  // Highly responsive width: scale for ANY dataset size
  // Base calculation: more points = wider chart
  const dataPointWidth = (() => {
    if (performanceData.length > 200) return 8; // Very dense: 8px per point
    if (performanceData.length > 120) return 10; // Dense: 10px per point
    if (performanceData.length > 60) return 12; // Medium: 12px per point
    if (performanceData.length > 24) return 15; // Sparse: 15px per point
    return 20; // Very sparse: 20px per point
  })();

  const baseChartWidth = 600;
  const calculatedWidth = performanceData.length * dataPointWidth;
  const chartWidth = Math.max(baseChartWidth, calculatedWidth);

  const chartHeight = 300;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const points = performanceData.map((item, idx) => {
    const x =
      padding.left +
      (idx / Math.max(performanceData.length - 1, 1)) * plotWidth;
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

  // Smart dot frequency based on total data points
  // Aim for roughly 20-30 visible dots maximum regardless of data size
  const dotFrequency = (() => {
    const targetDots = 25;
    return Math.max(1, Math.ceil(performanceData.length / targetDots));
  })();
  const showDots = points.map(
    (p, idx) => idx % dotFrequency === 0 || idx === points.length - 1,
  );

  const linePathInvestedValue = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.yInvestedValue}`)
    .join(" ");
  const linePathCurrentValue = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.yCurrentValue}`)
    .join(" ");

  // Y-axis gridlines and labels
  const gridLines = [];
  const yAxisLabels = [];
  for (let i = 0; i <= 4; i++) {
    const ratio = i / 4;
    const y = padding.top + plotHeight - ratio * plotHeight;
    const value = minValue + ratio * range;
    gridLines.push(
      <line
        key={`grid-${i}`}
        x1={padding.left}
        y1={y}
        x2={chartWidth - padding.right}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth="1"
        strokeDasharray="2,2"
      />,
    );
    yAxisLabels.push(
      <text
        key={`label-${i}`}
        x={padding.left - 8}
        y={y}
        textAnchor="end"
        dominantBaseline="middle"
        style={{ fontSize: 13, fill: "#6b7280" }}
      >
        {formatValue(value)}
      </text>,
    );
  }

  return (
    <Box
      sx={{
        overflowX: "auto",
        p: 2,
        bgcolor: "background.paper",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <svg width={chartWidth} height={chartHeight} style={{ display: "block" }}>
        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight - padding.bottom}
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="#d1d5db"
          strokeWidth="1"
        />

        {/* Gridlines and labels */}
        {gridLines}
        {yAxisLabels}

        {/* X-axis labels - smart adaptive spacing for any dataset size */}
        {points.map((p, idx) => {
          // Dynamically determine label frequency to avoid overcrowding
          // Show approximately 8-12 labels regardless of data size
          const targetLabels = 10;
          const labelFrequency = Math.max(
            1,
            Math.ceil(performanceData.length / targetLabels),
          );

          if (idx % labelFrequency !== 0 && idx !== points.length - 1)
            return null;

          return (
            <text
              key={`x-label-${idx}`}
              x={p.x}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              style={{
                fontSize: performanceData.length > 100 ? 9 : 10,
                fill: "#6b7280",
              }}
            >
              {p.label}
            </text>
          );
        })}

        {/* Lines */}
        <path
          d={linePathInvestedValue}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
        />
        <path
          d={linePathCurrentValue}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
        />

        {points.map((p, pointIdx) => {
          const tooltipWidth = 200;
          const tooltipHeight = 96;
          let tooltipX = p.x - tooltipWidth / 2;
          let tooltipY = p.yCurrentValue - tooltipHeight - 10;

          if (tooltipX < padding.left) tooltipX = padding.left + 5;
          if (tooltipX + tooltipWidth > chartWidth - padding.right)
            tooltipX = chartWidth - padding.right - tooltipWidth - 5;

          if (tooltipY < padding.top) tooltipY = p.yCurrentValue + 10;

          const shouldShowDot = showDots[pointIdx];

          return (
            <g key={`point-${pointIdx}`}>
              {shouldShowDot && (
                <>
                  <circle
                    cx={p.x}
                    cy={p.yCurrentValue}
                    r={hoveredIndex === pointIdx ? 5 : 3}
                    fill="#3b82f6"
                    opacity={hoveredIndex === pointIdx ? 1 : 0.7}
                    style={{ cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={() => setHoveredIndex(pointIdx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  <circle
                    cx={p.x}
                    cy={p.yInvestedValue}
                    r={hoveredIndex === pointIdx ? 4.5 : 2.5}
                    fill="#f59e0b"
                    opacity={hoveredIndex === pointIdx ? 1 : 0.6}
                    style={{ cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={() => setHoveredIndex(pointIdx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </>
              )}

              {hoveredIndex === pointIdx && (
                <g>
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx="4"
                    fill="#1f2937"
                    opacity="0.95"
                  />
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 14}
                    textAnchor="middle"
                    style={{ fontSize: 14, fontWeight: 700, fill: "#fff" }}
                  >
                    {dayjs(p.date).format("MM-DD-YYYY")}
                  </text>
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 42}
                    style={{ fontSize: 11, fill: "#e5e7eb" }}
                  >
                    <tspan fontWeight="600">Current Value:</tspan>
                  </text>
                  <text
                    x={tooltipX + tooltipWidth - 8}
                    y={tooltipY + 42}
                    textAnchor="end"
                    style={{ fontSize: 11, fill: "#3b82f6", fontWeight: 700 }}
                  >
                    {formatValue(p.currentValue)}
                  </text>
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 56}
                    style={{ fontSize: 11, fill: "#e5e7eb" }}
                  >
                    <tspan fontWeight="600">Invested:</tspan>
                  </text>
                  <text
                    x={tooltipX + tooltipWidth - 8}
                    y={tooltipY + 56}
                    textAnchor="end"
                    style={{ fontSize: 11, fill: "#f59e0b", fontWeight: 700 }}
                  >
                    {formatValue(p.investedValue)}
                  </text>
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 70}
                    style={{ fontSize: 11, fill: "#e5e7eb" }}
                  >
                    <tspan fontWeight="600">Gain / Loss:</tspan>
                  </text>
                  <text
                    x={tooltipX + tooltipWidth - 8}
                    y={tooltipY + 70}
                    textAnchor="end"
                    style={{
                      fontSize: 11,
                      fill: p.gainLossValue >= 0 ? "#10b981" : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {p.gainLossValue >= 0 ? "+" : ""}
                    {formatValue(p.gainLossValue)}
                  </text>
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 84}
                    style={{
                      fontSize: 10,
                      fill: p.gainLossValue >= 0 ? "#10b981" : "#ef4444",
                    }}
                  >
                    {p.gainLossPercentage >= 0 ? "+" : ""}
                    {p.gainLossPercentage.toFixed(2)}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 3,
          mt: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 20, height: 2, backgroundColor: "#3b82f6" }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Current Value
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 2,
              backgroundColor: "#f59e0b",
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Invested Amount
          </Typography>
        </Box>
      </Box>

      {/* Info note for large datasets */}
      {performanceData.length > 12 && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: "#f3f4f6", borderRadius: 1 }}>
          <Typography
            variant="caption"
            sx={{ display: "block", color: "text.secondary" }}
          >
            <strong>{performanceData.length}</strong> data points •
            {performanceData.length > 100
              ? " Horizontal scroll enabled for large dataset • "
              : " "}
            Dots shown at key intervals for clarity
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default InvestmentViewDrawer;

export function InvestmentViewDrawer({
  open,
  onClose,
  investment,
  taxonomyNodes = [],
  onEdit,
  onPlanUpdated,
}) {
  const [recordValuationOpen, setRecordValuationOpen] = React.useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = React.useState(null);
  const [deleteSnapshotTarget, setDeleteSnapshotTarget] = React.useState(null);
  const [snapshotActionLoading, setSnapshotActionLoading] = React.useState(false);
  const [planActionLoading, setPlanActionLoading] = React.useState(false);
  const [planActionError, setPlanActionError] = React.useState("");
  const [planEndDateDraft, setPlanEndDateDraft] = React.useState("");
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );

  React.useEffect(() => {
    if (!open) return;
    setPlanActionError("");
    setPlanEndDateDraft(
      investment?.activeContributionPlan?.endDate
        ? dayjs(investment.activeContributionPlan.endDate).format("YYYY-MM-DD")
        : "",
    );
  }, [open, investment?.activeContributionPlan?.endDate]);

  const handleSnapshotAdded = async () => {
    await onPlanUpdated?.();
  };

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
        <AppButton
          variant="contained"
          onClick={() => onEdit?.(investment)}
          sx={{ minWidth: 160 }}
        >
          Edit Investment
        </AppButton>
      ) : null}
    </Box>
  );

  const handlePlanUpdate = async (payload, successMessage) => {
    if (!investment?.activeContributionPlan?.id || !investment?.id) return;

    setPlanActionError("");
    setPlanActionLoading(true);

    try {
      await updateContributionPlan(
        investment.id,
        investment.activeContributionPlan.id,
        payload,
      );
      await onPlanUpdated?.();
      pushNotification({ type: "success", message: successMessage });
    } catch (error) {
      const fallbackMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update recurring plan";
      setPlanActionError(fallbackMessage);
      pushNotification({ type: "error", message: fallbackMessage });
    } finally {
      setPlanActionLoading(false);
    }
  };

  const handlePausePlan = () =>
    handlePlanUpdate({ status: "paused" }, "Recurring plan paused");

  const handleResumePlan = () =>
    handlePlanUpdate({ status: "active" }, "Recurring plan resumed");

  const handleSavePlanEndDate = () =>
    handlePlanUpdate(
      {
        endDate: planEndDateDraft || null,
      },
      "Recurring plan end date updated",
    );

  const hasValuationSnapshots =
    Array.isArray(investment?.valuationSnapshots) &&
    investment.valuationSnapshots.length > 0;
  const valuationSnapshots = React.useMemo(() => {
    if (!Array.isArray(investment?.valuationSnapshots)) {
      return [];
    }

    return [...investment.valuationSnapshots].sort(
      (left, right) =>
        new Date(right.snapshotDate).getTime() -
        new Date(left.snapshotDate).getTime(),
    );
  }, [investment?.valuationSnapshots]);
  const latestSnapshot = valuationSnapshots[0] ?? null;
  const effectiveCurrentValue = Number(
    investment?.currentValue ?? investment?.totalInvested ?? 0,
  );
  const effectiveTotalInvested = Number(investment?.totalInvested ?? 0);
  const totalReturnValue = effectiveCurrentValue - effectiveTotalInvested;
  const totalReturnPercentage =
    effectiveTotalInvested > 0
      ? (totalReturnValue / effectiveTotalInvested) * 100
      : 0;
  const totalReturnColor = totalReturnValue >= 0 ? "#10b981" : "#ef4444";

  const handleDeleteSnapshot = async () => {
    if (!deleteSnapshotTarget?.id) return;

    setSnapshotActionLoading(true);
    try {
      await deleteValuationSnapshot(deleteSnapshotTarget.id);
      await onPlanUpdated?.();
      pushNotification({
        type: "success",
        message: `Deleted valuation snapshot for ${formatInvestmentDate(deleteSnapshotTarget.snapshotDate)}`,
      });
      setDeleteSnapshotTarget(null);
    } catch (error) {
      pushNotification({
        type: "error",
        message: getRuntimeErrorMessage(
          error,
          "Failed to delete valuation snapshot",
        ),
      });
    } finally {
      setSnapshotActionLoading(false);
    }
  };

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={investment?.name || "Investment Details"}
      subtitle="Review current value, dates, and notes."
      width={760}
      footer={footer}
    >
      {!investment ? (
        <EmptyState
          text="Investment not found"
          subText="This investment no longer exists or the list changed."
          actionLabel="Close"
          onAction={onClose}
        />
      ) : (
        <Stack spacing={2}>
          {/* Row 1: Overview & Contribution Plan */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <SectionCard
              title="Overview"
              subtitle={`${investment.institution} • ${investment.type}`}
            >
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Total Invested
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatInvestmentCurrency(investment.totalInvested)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Current Value
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatInvestmentCurrency(effectiveCurrentValue)}
                  </Typography>
                </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 1,
                      pt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 1,
                        bgcolor: "#f8fafc",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
                      >
                        Invested Amount
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatInvestmentCurrency(effectiveTotalInvested)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 1,
                        bgcolor: totalReturnValue >= 0 ? "#ecfdf5" : "#fef2f2",
                        border: "1px solid",
                        borderColor: totalReturnValue >= 0 ? "#a7f3d0" : "#fecaca",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
                      >
                        Profit / Loss
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: totalReturnColor }}
                      >
                        {totalReturnValue >= 0 ? "+" : ""}
                        {formatInvestmentCurrency(totalReturnValue)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Return %
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: totalReturnColor,
                      }}
                    >
                      {effectiveTotalInvested > 0
                        ? `${totalReturnPercentage.toFixed(2)}%`
                        : "N/A"}
                    </Typography>
                  </Box>
              </Stack>
            </SectionCard>

            {investment.activeContributionPlan && (
              <SectionCard
                title="Contribution Plan"
                subtitle="Recurring investment schedule"
              >
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Contribution Amount
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatInvestmentCurrency(
                        investment.activeContributionPlan.amount,
                      )}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Frequency
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {investment.activeContributionPlan.cadenceInterval > 1
                        ? `Every ${investment.activeContributionPlan.cadenceInterval} `
                        : ""}
                      {investment.activeContributionPlan.cadenceUnit}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      Next Due Date
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatInvestmentDate(
                          investment.activeContributionPlan.nextDueDate,
                        )}
                      </Typography>
                      {investment.activeContributionPlan.nextDueDate &&
                        (() => {
                          const daysUntil = dayjs(
                            investment.activeContributionPlan.nextDueDate,
                          )
                            .startOf("day")
                            .diff(dayjs().startOf("day"), "day");
                          const isOverdue = daysUntil < 0;
                          const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
                          return (
                            <Chip
                              size="small"
                              label={
                                isOverdue
                                  ? "Overdue"
                                  : isDueSoon
                                    ? `In ${daysUntil}d`
                                    : `In ${daysUntil}d`
                              }
                              color={
                                isOverdue
                                  ? "error"
                                  : isDueSoon
                                    ? "warning"
                                    : "default"
                              }
                              sx={{ height: 20, fontSize: 11 }}
                            />
                          );
                        })()}
                    </Box>
                  </Box>
                </Stack>
              </SectionCard>
            )}
          </Box>

          {/* Row 2: Performance History (Full Width) */}
          <Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Performance History
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Account value growth, contributions, and returns over time.
                </Typography>
                {latestSnapshot ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                      mt: 1,
                    }}
                  >
                    <Chip
                      size="small"
                      label={`${valuationSnapshots.length} snapshots`}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Latest ${formatInvestmentDate(latestSnapshot.snapshotDate)}`}
                    />
                  </Box>
                ) : null}
              </Box>
              <IconButton
                size="small"
                variant="contained"
                onClick={handleOpenCreateSnapshot}
                sx={{
                  bgcolor: "#f3f4f6",
                  "&:hover": { bgcolor: "#e5e7eb" },
                }}
                title="Record new valuation snapshot"
              >
                <Icon path={mdiPlus} size={1} />
              </IconButton>
            </Box>
            <Box
              sx={{
                p: 2,
                bgcolor: "background.paper",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {hasValuationSnapshots ? (
                <Stack spacing={2.5}>
                  <InvestmentPerformanceChart
                    investment={investment}
                    formatValue={formatInvestmentCurrency}
                  />

                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                        mb: 1.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Snapshot History
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Maintain historical valuations without leaving the drawer.
                        </Typography>
                      </Box>
                    </Box>

                    <TableContainer
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        overflowX: "auto",
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Market Value</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Units</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {valuationSnapshots.map((snapshot) => (
                            <TableRow key={snapshot.id} hover>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {formatInvestmentDate(snapshot.snapshotDate)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {dayjs(snapshot.snapshotDate).format("ddd")}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {formatInvestmentCurrency(snapshot.marketValue)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {snapshot.units ?? "-"}
                              </TableCell>
                              <TableCell>
                                {snapshot.price != null
                                  ? formatInvestmentCurrency(snapshot.price)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={snapshot.source || "manual"}
                                  sx={{ textTransform: "capitalize" }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Box
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEditSnapshot(snapshot)}
                                    aria-label={`Edit valuation on ${formatInvestmentDate(snapshot.snapshotDate)}`}
                                  >
                                    <Icon path={mdiPencilOutline} size={0.8} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setDeleteSnapshotTarget(snapshot)}
                                    aria-label={`Delete valuation on ${formatInvestmentDate(snapshot.snapshotDate)}`}
                                  >
                                    <Icon path={mdiDeleteOutline} size={0.8} />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Stack>
              ) : (
                <EmptyState
                  text="No valuation history yet"
                  subText="Record the first valuation snapshot to start tracking current value, profit, and growth over time."
                  actionLabel="Record Valuation"
                  onAction={handleOpenCreateSnapshot}
                />
              )}
            </Box>
          </Box>

          {/* Row 3: Common Information & Investment Details */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <SectionCard title="Common Information">
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Status
                  </Typography>
                  <StatusChip
                    label={investment.status}
                    tone={getInvestmentStatusTone(investment.status)}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Category
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {getInvestmentCategoryLabel(
                      investment.category,
                      taxonomyNodes,
                    )}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Start Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatInvestmentDate(investment.startDate)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Reference
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {investment.referenceNumber || "Not recorded"}
                  </Typography>
                </Box>
              </Stack>
            </SectionCard>

            <SectionCard title="Investment Details">
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Asset Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {investment.type}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Holding Mode
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {investment.holdingMode || "Not recorded"}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Maturity Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatInvestmentDate(investment.maturityDate)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Insurance Cover
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatInvestmentCurrency(investment.insuranceCover)}
                  </Typography>
                </Box>
              </Stack>
            </SectionCard>
          </Box>

          {investment.activeContributionPlan ? (
            <SectionCard
              title="Recurring Plan Management"
              subtitle="Pause/resume schedule generation and update optional end date."
            >
              <Stack spacing={1.5}>
                {planActionError ? (
                  <Alert severity="error">{planActionError}</Alert>
                ) : null}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600 }}
                  >
                    Plan Status
                  </Typography>
                  <StatusChip
                    label={String(
                      investment.activeContributionPlan.status || "active",
                    )}
                    tone={
                      String(
                        investment.activeContributionPlan.status || "active",
                      ).toLowerCase() === "active"
                        ? "success"
                        : "warning"
                    }
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <AppButton
                    variant="outlined"
                    onClick={handlePausePlan}
                    disabled={
                      planActionLoading ||
                      String(
                        investment.activeContributionPlan.status || "",
                      ).toLowerCase() === "paused"
                    }
                  >
                    Pause Plan
                  </AppButton>
                  <AppButton
                    variant="outlined"
                    onClick={handleResumePlan}
                    disabled={
                      planActionLoading ||
                      String(
                        investment.activeContributionPlan.status || "",
                      ).toLowerCase() === "active"
                    }
                  >
                    Resume Plan
                  </AppButton>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <TextField
                    type="date"
                    size="small"
                    label="Plan End Date"
                    value={planEndDateDraft}
                    onChange={(event) =>
                      setPlanEndDateDraft(event.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                  <AppButton
                    variant="contained"
                    onClick={handleSavePlanEndDate}
                    disabled={planActionLoading}
                  >
                    Save End Date
                  </AppButton>
                </Box>
              </Stack>
            </SectionCard>
          ) : null}

          {/* Row 4: Documents & Notes */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <SectionCard
              title="Documents"
              subtitle="Stored as operational references in MVP."
            >
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                {investment.documents || "No document references added"}
              </Typography>
            </SectionCard>

            <SectionCard title="Notes">
              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                {investment.notes || "No notes added"}
              </Typography>
            </SectionCard>
          </Box>
        </Stack>
      )}

      {/* Record Valuation Modal */}
      <RecordValuationModal
        open={recordValuationOpen}
        onClose={handleCloseSnapshotModal}
        investmentId={investment?.id}
        investmentName={investment?.name}
        snapshot={selectedSnapshot}
        onSnapshotSaved={handleSnapshotAdded}
      />

      <ConfirmDialog
        open={Boolean(deleteSnapshotTarget)}
        title="Delete valuation snapshot"
        description={
          deleteSnapshotTarget
            ? `Remove the snapshot from ${formatInvestmentDate(deleteSnapshotTarget.snapshotDate)}? The investment current value will be recalculated from the latest remaining snapshot.`
            : ""
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={snapshotActionLoading}
        onCancel={() => setDeleteSnapshotTarget(null)}
        onConfirm={handleDeleteSnapshot}
      />
    </AppDrawer>
  );
}
