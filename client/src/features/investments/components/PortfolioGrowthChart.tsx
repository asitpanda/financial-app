import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import type { InvestmentPortfolioGrowthPoint } from "../investments.selectors";

interface PortfolioGrowthChartProps {
  data: InvestmentPortfolioGrowthPoint[];
  formatValue: (value: number) => string;
}

const TIMEFRAME_OPTIONS = [
  { value: "6m", label: "6M", months: 6 },
  { value: "1y", label: "1Y", months: 12 },
  { value: "all", label: "All", months: null },
] as const;

const createStepLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return "";

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    return `${path} H ${point.x} V ${point.y}`;
  }, "");
};

const getXAxisStep = (pointCount: number) => {
  if (pointCount > 84) return 12;
  if (pointCount > 48) return 6;
  if (pointCount > 24) return 3;
  if (pointCount > 12) return 2;
  return 1;
};

export default function PortfolioGrowthChart({
  data,
  formatValue,
}: PortfolioGrowthChartProps) {
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAME_OPTIONS)[number]["value"]>("1y");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const selectedOption = TIMEFRAME_OPTIONS.find(
    (option) => option.value === timeframe,
  );
  const visibleData =
    !selectedOption || selectedOption.months === null
      ? data
      : data.slice(-selectedOption.months);

  if (data.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
        No portfolio growth data available
      </Typography>
    );
  }

  const padding = { top: 20, right: 20, bottom: 52, left: 80 };
  const chartWidth = 1000;
  const chartHeight = 320;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const minValue = Math.min(0, ...visibleData.map((item) => item.returnToDate));
  const maxValue = Math.max(
    1,
    ...visibleData.flatMap((item) => [
      item.investedToDate,
      item.currentValueToDate,
      item.returnToDate,
    ]),
  );
  const valueRange = maxValue - minValue || 1;
  const yForValue = (value: number) =>
    padding.top + ((maxValue - value) / valueRange) * plotHeight;
  const baselineY = yForValue(0);
  const xAxisStep = getXAxisStep(visibleData.length);

  const points = visibleData.map((item, index) => ({
    ...item,
    index,
    x: padding.left + (index / Math.max(visibleData.length - 1, 1)) * plotWidth,
    yInvested: yForValue(item.investedToDate),
    yCurrent: yForValue(item.currentValueToDate),
  }));

  const activePoint =
    hoveredIndex === null ? null : points[Math.min(hoveredIndex, points.length - 1)];

  const currentPath = createStepLinePath(
    points.map((point) => ({ x: point.x, y: point.yCurrent })),
  );
  const investedPathStepped = createStepLinePath(
    points.map((point) => ({ x: point.x, y: point.yInvested })),
  );

  const tooltipWidth = 240;
  const tooltipHeight = 98;
  const tooltipX = activePoint
    ? activePoint.x > chartWidth - padding.right - tooltipWidth - 12
      ? chartWidth - padding.right - tooltipWidth
      : Math.max(
          padding.left,
          Math.min(
            activePoint.x - tooltipWidth / 2,
            chartWidth - padding.right - tooltipWidth,
          ),
        )
    : 0;
  const tooltipY = activePoint
    ? activePoint.x > chartWidth - padding.right - tooltipWidth - 12
      ? padding.top + 8
      : Math.max(
          padding.top,
          Math.min(
            Math.min(activePoint.yCurrent, activePoint.yInvested) -
              tooltipHeight -
              14,
            chartHeight - padding.bottom - tooltipHeight - 10,
          ),
        )
    : 0;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
          View portfolio growth over a shorter or longer history.
        </Typography>
        <Box sx={{ display: "inline-flex", gap: 0.5, p: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          {TIMEFRAME_OPTIONS.map((option) => {
            const selected = timeframe === option.value;

            return (
              <AppButton
                key={option.value}
                size="small"
                variant={selected ? "contained" : "text"}
                onClick={() => {
                  setTimeframe(option.value);
                  setHoveredIndex(null);
                }}
                sx={{ minWidth: 52, px: 1.25 }}
              >
                {option.label}
              </AppButton>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onMouseMove={(event) => {
              const svg = event.currentTarget.ownerSVGElement;
              if (!svg) return;

              const point = svg.createSVGPoint();
              point.x = event.clientX;
              point.y = event.clientY;

              const transformedPoint = point.matrixTransform(
                svg.getScreenCTM()?.inverse(),
              );

              const relativeX = Math.max(
                0,
                Math.min(transformedPoint.x - padding.left, plotWidth),
              );
              const nextIndex = Math.round(
                (relativeX / plotWidth) * Math.max(points.length - 1, 0),
              );

              setHoveredIndex(nextIndex);
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          />

          {Array.from({ length: 5 }, (_, index) => {
            const ratio = index / 4;
            const value = maxValue - ratio * valueRange;
            const y = yForValue(value);

            return (
              <g key={`grid-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="3,3"
                />
                <text
                  x={padding.left - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{ fontSize: 11, fill: "#6b7280" }}
                >
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            y1={baselineY}
            x2={chartWidth - padding.right}
            y2={baselineY}
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {points.slice(0, -1).map((point, index) => {
            const nextPoint = points[index + 1];
            const bandTop = Math.min(point.yCurrent, point.yInvested);
            const bandHeight = Math.abs(point.yCurrent - point.yInvested);

            return (
              <rect
                key={`band-${point.label}`}
                x={point.x}
                y={bandTop}
                width={Math.max(nextPoint.x - point.x, 0)}
                height={bandHeight}
                fill={point.returnToDate >= 0 ? "rgba(16, 185, 129, 0.14)" : "rgba(239, 68, 68, 0.14)"}
              />
            );
          })}
          {points.map((point) => {
            const connectorTop = Math.min(point.yCurrent, point.yInvested);
            const connectorHeight = Math.abs(point.yCurrent - point.yInvested);

            if (connectorHeight < 2) {
              return null;
            }

            return (
              <rect
                key={`connector-${point.label}`}
                x={point.x - 3}
                y={connectorTop}
                width={6}
                height={connectorHeight}
                rx={3}
                fill={point.returnToDate >= 0 ? "rgba(16, 185, 129, 0.22)" : "rgba(239, 68, 68, 0.24)"}
              />
            );
          })}
          <path
            d={currentPath}
            fill="none"
            stroke="#0f766e"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d={investedPathStepped}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray="8,5"
          />

          {points.map((point) => (
            <text
              key={`x-${point.label}`}
              x={point.x}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              style={{ fontSize: 11, fill: "#6b7280" }}
            >
              {point.index === 0 ||
              point.index === points.length - 1 ||
              point.index % xAxisStep === 0
                ? xAxisStep >= 12
                  ? point.label.slice(-4)
                  : point.label
                : ""}
            </text>
          ))}

          {activePoint ? (
            <>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={chartHeight - padding.bottom}
                stroke="#94a3b8"
                strokeDasharray="4,4"
              />

              <circle cx={activePoint.x} cy={activePoint.yCurrent} r={5} fill="#0f766e" />
              <circle cx={activePoint.x} cy={activePoint.yInvested} r={5} fill="#f59e0b" />
            </>
          ) : null}

          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].yCurrent}
            r={4}
            fill="#0f766e"
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].yInvested}
            r={4}
            fill="#f59e0b"
          />

          {activePoint ? (
            <g style={{ pointerEvents: "none" }}>
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height={tooltipHeight}
                rx="8"
                fill="#0f172a"
                opacity="0.96"
              />
              <text
                x={tooltipX + 12}
                y={tooltipY + 18}
                style={{ fontSize: 12, fill: "#f8fafc", fontWeight: 700 }}
              >
                {activePoint.label}
              </text>
              <text
                x={tooltipX + 12}
                y={tooltipY + 38}
                style={{ fontSize: 11, fill: "#f59e0b" }}
              >
                Invested: {formatValue(activePoint.investedToDate)}
              </text>
              <text
                x={tooltipX + 12}
                y={tooltipY + 54}
                style={{ fontSize: 11, fill: "#5eead4" }}
              >
                Current: {formatValue(activePoint.currentValueToDate)}
              </text>
              <text
                x={tooltipX + 12}
                y={tooltipY + 70}
                style={{
                  fontSize: 11,
                  fill: activePoint.returnToDate >= 0 ? "#86efac" : "#fca5a5",
                }}
              >
                Return: {activePoint.returnToDate >= 0 ? "+" : ""}
                {formatValue(activePoint.returnToDate)}
                {activePoint.investedToDate > 0
                  ? ` (${((activePoint.returnToDate / activePoint.investedToDate) * 100).toFixed(1)}%)`
                  : ""}
              </text>
              <text
                x={tooltipX + 12}
                y={tooltipY + 86}
                style={{ fontSize: 10, fill: "#cbd5e1" }}
              >
                Snapshot-backed: {formatValue(activePoint.snapshotBackedValue)}
              </text>
            </g>
          ) : null}

          <text
            x={points[points.length - 1].x - 12}
            y={points[points.length - 1].yCurrent - 8}
            textAnchor="end"
            style={{ fontSize: 11, fill: "#0f766e", fontWeight: 700 }}
          >
            Current
          </text>
          <text
            x={points[points.length - 1].x - 12}
            y={points[points.length - 1].yInvested - 8}
            textAnchor="end"
            style={{ fontSize: 11, fill: "#f59e0b", fontWeight: 700 }}
          >
            Invested
          </text>
        </svg>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 24, height: 2, backgroundColor: "#0f766e" }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Current Value
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 24, height: 2, backgroundColor: "#f59e0b" }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Total Invested
          </Typography>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
        Hover a month to inspect cumulative invested amount, portfolio value, and return. The gap is green for gain and red for loss.
      </Typography>
    </Stack>
  );
}