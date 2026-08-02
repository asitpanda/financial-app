// @ts-nocheck
import React from "react";
import {
  Alert,
  Box,
  Chip,
  Stack,
  Typography,
  IconButton,
  TextField,
} from "@mui/material";
import { mdiPlus } from "@mdi/js";
import Icon from "@mdi/react";
import dayjs from "dayjs";
import AppDrawer from "../../../components/drawers/AppDrawer";
import AppButton from "../../../components/common/AppButton";
import {
  EmptyState,
  SectionCard,
  StatusChip,
} from "../../../components/common";
import RecordValuationModal from "./RecordValuationModal";
import { updateContributionPlan } from "../api/contributionPlans.api";
import { useNotificationStore } from "../../../store/notificationStore";
import {
  formatInvestmentCurrency,
  formatInvestmentDate,
  getInvestmentCategoryLabel,
  getInvestmentStatusTone,
} from "../../../utils/investmentHelpers";

function InvestmentPerformanceChart({ investment, formatValue }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  // Build performance data from valuationSnapshots if available
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

    // Get the earliest snapshot date to calculate contributions from
    const earliestDate =
      sorted.length > 0 ? new Date(sorted[0].snapshotDate) : new Date();
    const today = new Date();
    const totalDaysSpan = (today - earliestDate) / (1000 * 60 * 60 * 24);

    return sorted.map((snapshot, idx) => {
      const snapshotDate = new Date(snapshot.snapshotDate);
      const daysFromStart =
        (snapshotDate - earliestDate) / (1000 * 60 * 60 * 24);

      // Calculate cumulative contribution based on SIP cadence if available
      let cumulativeContribution;

      if (investment.activeContributionPlan) {
        // Use actual contribution plan data for accurate historical contributions
        const { amount, cadenceInterval, cadenceUnit } =
          investment.activeContributionPlan;

        // Calculate number of periods elapsed (including the initial contribution)
        let periodsElapsed = 0;
        if (cadenceUnit === "month") {
          periodsElapsed = Math.floor(daysFromStart / 30) + 1; // +1 for initial contribution
        } else if (cadenceUnit === "quarter") {
          periodsElapsed = Math.floor(daysFromStart / 90) + 1;
        } else if (cadenceUnit === "year") {
          periodsElapsed = Math.floor(daysFromStart / 365) + 1;
        } else if (cadenceUnit === "week") {
          periodsElapsed = Math.floor(daysFromStart / 7) + 1;
        }

        // Each period contributes (amount * cadenceInterval)
        cumulativeContribution = periodsElapsed * amount * cadenceInterval;
        cumulativeContribution = Math.max(
          0,
          Math.min(investment.totalInvested, cumulativeContribution),
        );
      } else {
        // Fallback: assume linear contribution if no plan data
        const progressRatio =
          totalDaysSpan > 0 ? daysFromStart / totalDaysSpan : 0;
        cumulativeContribution = Math.round(
          investment.totalInvested * progressRatio,
        );
        cumulativeContribution = Math.max(
          0,
          Math.min(investment.totalInvested, cumulativeContribution),
        );
      }

      return {
        date: snapshot.snapshotDate,
        label: dayjs(snapshot.snapshotDate).format("MMM YY"),
        marketValue: snapshot.marketValue,
        contribution: cumulativeContribution,
        return: snapshot.marketValue - cumulativeContribution,
        idx,
      };
    });
  }, [
    investment.valuationSnapshots,
    investment.totalInvested,
    investment.activeContributionPlan,
  ]);

  if (performanceData.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
        No historical performance data available yet
      </Typography>
    );
  }

  const maxValue = Math.max(
    ...performanceData.map((d) => Math.max(d.marketValue, d.contribution)),
  );
  const minValue = Math.min(...performanceData.map((d) => d.return), 0);
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
    const yContribution =
      padding.top +
      plotHeight -
      ((item.contribution - minValue) / range) * plotHeight;
    const yMarketValue =
      padding.top +
      plotHeight -
      ((item.marketValue - minValue) / range) * plotHeight;
    const yReturn =
      padding.top +
      plotHeight -
      ((item.return - minValue) / range) * plotHeight;
    return { x, yContribution, yMarketValue, yReturn, ...item };
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

  const linePathContribution = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.yContribution}`)
    .join(" ");
  const linePathMarketValue = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.yMarketValue}`)
    .join(" ");
  const linePathReturn = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.yReturn}`)
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
          d={linePathContribution}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <path
          d={linePathMarketValue}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
        />
        <path
          d={linePathReturn}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
        />

        {/* Interactive points - dots only shown at key intervals for large datasets */}
        {points.map((p, pointIdx) => {
          // Smart tooltip positioning - detect if we're on right side of chart
          const tooltipWidth = 200;
          const tooltipHeight = 100;
          let tooltipX = p.x - tooltipWidth / 2;
          let tooltipY = p.yMarketValue - tooltipHeight - 10;

          // Adjust horizontal position if near edges
          if (tooltipX < padding.left) tooltipX = padding.left + 5;
          if (tooltipX + tooltipWidth > chartWidth - padding.right)
            tooltipX = chartWidth - padding.right - tooltipWidth - 5;

          // Adjust vertical position if above chart
          if (tooltipY < padding.top) tooltipY = p.yMarketValue + 10;

          // Only show dots for selected points
          const shouldShowDot = showDots[pointIdx];

          return (
            <g key={`point-${p.idx}`}>
              {shouldShowDot && (
                <>
                  {/* Dots for all three lines */}
                  {/* Market Value (Blue) */}
                  <circle
                    cx={p.x}
                    cy={p.yMarketValue}
                    r={hoveredIndex === p.idx ? 5 : 3}
                    fill="#3b82f6"
                    opacity={hoveredIndex === p.idx ? 1 : 0.7}
                    style={{ cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={() => setHoveredIndex(p.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  {/* Return (Green) */}
                  <circle
                    cx={p.x}
                    cy={p.yReturn}
                    r={hoveredIndex === p.idx ? 4.5 : 2.5}
                    fill="#10b981"
                    opacity={hoveredIndex === p.idx ? 1 : 0.7}
                    style={{ cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={() => setHoveredIndex(p.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  {/* Contribution (Gray) */}
                  <circle
                    cx={p.x}
                    cy={p.yContribution}
                    r={hoveredIndex === p.idx ? 4.5 : 2.5}
                    fill="#94a3b8"
                    opacity={hoveredIndex === p.idx ? 1 : 0.6}
                    style={{ cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={() => setHoveredIndex(p.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                </>
              )}

              {/* Tooltip always shows on hover, even for non-dot points */}
              {hoveredIndex === p.idx && (
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
                    <tspan fontWeight="600">Market Value:</tspan>
                  </text>
                  <text
                    x={tooltipX + tooltipWidth - 8}
                    y={tooltipY + 42}
                    textAnchor="end"
                    style={{ fontSize: 11, fill: "#3b82f6", fontWeight: 700 }}
                  >
                    {formatValue(p.marketValue)}
                  </text>
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 56}
                    style={{ fontSize: 11, fill: "#e5e7eb" }}
                  >
                    <tspan fontWeight="600">Contributed:</tspan>
                  </text>
                  <text
                    x={tooltipX + tooltipWidth - 8}
                    y={tooltipY + 56}
                    textAnchor="end"
                    style={{ fontSize: 11, fill: "#94a3b8", fontWeight: 700 }}
                  >
                    {formatValue(p.contribution)}
                  </text>
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 70}
                    style={{ fontSize: 11, fill: "#e5e7eb" }}
                  >
                    <tspan fontWeight="600">Return:</tspan>
                  </text>
                  <text
                    x={tooltipX + tooltipWidth - 8}
                    y={tooltipY + 70}
                    textAnchor="end"
                    style={{
                      fontSize: 11,
                      fill: p.return >= 0 ? "#10b981" : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {p.return >= 0 ? "+" : ""}
                    {formatValue(p.return)}
                  </text>
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 84}
                    style={{
                      fontSize: 10,
                      fill: "#9ca3af",
                      fontStyle: "italic",
                    }}
                  >
                    Return %:{" "}
                    {p.contribution > 0
                      ? ((p.return / p.contribution) * 100).toFixed(2)
                      : 0}
                    %
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
            Market Value (Current)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 20, height: 2, backgroundColor: "#10b981" }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Return/Gain
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 20,
              height: 2,
              backgroundColor: "#94a3b8",
              backgroundImage:
                "repeating-linear-gradient(90deg, #94a3b8 0px, #94a3b8 4px, transparent 4px, transparent 8px)",
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Total Invested (Cumulative)
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
    // Refetch the investment data to get updated snapshots
    if (investment?.id) {
      try {
        const response = await fetch(`/api/investments/${investment.id}`);
        if (response.ok) {
          // The parent component will need to handle refresh
          // For now, just close the modal
        }
      } catch (error) {
        console.error("Failed to refresh investment data:", error);
      }
    }
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
                    {formatInvestmentCurrency(
                      investment.currentValue || investment.totalInvested,
                    )}
                  </Typography>
                </Box>
                {investment.currentValue && (
                  <>
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
                        Total Return
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color:
                            investment.currentValue -
                              investment.totalInvested >=
                            0
                              ? "#10b981"
                              : "#ef4444",
                        }}
                      >
                        {investment.currentValue - investment.totalInvested >= 0
                          ? "+"
                          : ""}
                        {formatInvestmentCurrency(
                          investment.currentValue - investment.totalInvested,
                        )}
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
                        Return %
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color:
                            investment.totalInvested > 0 &&
                            ((investment.currentValue -
                              investment.totalInvested) /
                              investment.totalInvested) *
                              100 >=
                              0
                              ? "#10b981"
                              : "#ef4444",
                        }}
                      >
                        {investment.totalInvested > 0
                          ? (
                              ((investment.currentValue -
                                investment.totalInvested) /
                                investment.totalInvested) *
                              100
                            ).toFixed(2) + "%"
                          : "N/A"}
                      </Typography>
                    </Box>
                  </>
                )}
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
          {investment.valuationSnapshots &&
            investment.valuationSnapshots.length > 0 && (
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
                      Account value growth, contributions, and returns over
                      time.
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    variant="contained"
                    onClick={() => setRecordValuationOpen(true)}
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
                  <InvestmentPerformanceChart
                    investment={investment}
                    formatValue={formatInvestmentCurrency}
                  />
                </Box>
              </Box>
            )}

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
        onClose={() => setRecordValuationOpen(false)}
        investmentId={investment?.id}
        investmentName={investment?.name}
        onSnapshotAdded={handleSnapshotAdded}
      />
    </AppDrawer>
  );
}
