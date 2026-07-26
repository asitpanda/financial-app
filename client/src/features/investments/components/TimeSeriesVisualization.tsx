import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import type { InvestmentSeriesPoint } from "../investments.selectors";

const DONUT_PALETTE = [
  "#0f766e",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#10b981",
  "#f97316",
  "#ec4899",
];

interface TimeSeriesVisualizationProps {
  data: InvestmentSeriesPoint[];
  onDrill: (label: string) => void;
  onBack: () => void;
  isDrillMode: boolean;
  formatValue: (value: number) => string;
  categoryLabelMap: Record<string, string>;
}

export default function TimeSeriesVisualization({
  data,
  onDrill,
  onBack,
  isDrillMode,
  formatValue,
  categoryLabelMap,
}: TimeSeriesVisualizationProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
        No investment data available
      </Typography>
    );
  }

  const maxInvested = Math.max(...data.map((item) => item.invested));
  const maxReturn = Math.max(...data.map((item) => Math.abs(item.return)), 1);
  const maxTotal = Math.max(maxInvested, maxReturn);

  const padding = { top: 24, right: 24, bottom: 60, left: 80 };
  const chartWidth = 1000;
  const chartHeight = 320;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const points = data.map((item, idx) => {
    const x = padding.left + (idx / (data.length - 1 || 1)) * plotWidth;
    const yInvested =
      padding.top + plotHeight - (item.invested / maxTotal) * plotHeight;
    const yReturn =
      padding.top + plotHeight - (item.return / maxTotal) * plotHeight;
    return { x, yInvested, yReturn, ...item, idx };
  });

  const linePathInvested = points
    .map(
      (point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.yInvested}`,
    )
    .join(" ");
  const linePathReturn = points
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x} ${point.yReturn}`)
    .join(" ");

  const gridLines = [];
  const yAxisLabels = [];
  for (let i = 0; i <= 5; i++) {
    const ratio = i / 5;
    const y = padding.top + plotHeight - ratio * plotHeight;
    const value = ratio * maxTotal;
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
        style={{ fontSize: 11, fill: "#6b7280" }}
      >
        {formatValue(value)}
      </text>,
    );
  }

  const categoryColors: Record<string, string> = {};
  if (data[0]) {
    Object.keys(data[0].investedBreakdown).forEach((category, idx) => {
      categoryColors[category] = DONUT_PALETTE[idx % DONUT_PALETTE.length];
    });
  }

  return (
    <Stack spacing={2}>
      {isDrillMode && (
        <Box sx={{ mb: 1 }}>
          <AppButton variant="text" onClick={onBack} sx={{ mb: 1 }}>
            ← Back to Yearly View
          </AppButton>
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Box
          sx={{
            overflowX: "auto",
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <svg
            width={chartWidth}
            height={chartHeight}
            style={{ display: "block" }}
          >
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={chartHeight - padding.bottom}
              stroke="#d1d5db"
              strokeWidth="1"
            />
            <line
              x1={padding.left}
              y1={chartHeight - padding.bottom}
              x2={chartWidth - padding.right}
              y2={chartHeight - padding.bottom}
              stroke="#d1d5db"
              strokeWidth="1"
            />
            {gridLines}
            {yAxisLabels}
            {points.map((point) => (
              <text
                key={`x-label-${point.idx}`}
                x={point.x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                style={{ fontSize: 11, fill: "#6b7280" }}
              >
                {point.label}
              </text>
            ))}
            <path
              d={linePathInvested}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
            />
            <path
              d={linePathReturn}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="4,4"
            />
            {points.map((point) => {
              const tooltipWidth = 160;
              const tooltipHeight = 65;
              const tooltipGap = 8;
              const spaceAbove = point.yInvested - padding.top;
              const positionBelow = spaceAbove < tooltipHeight + tooltipGap + 5;

              const tooltipX = Math.max(
                padding.left,
                Math.min(
                  point.x - tooltipWidth / 2,
                  chartWidth - padding.right - tooltipWidth,
                ),
              );
              const tooltipY = positionBelow
                ? Math.max(padding.top, point.yInvested + tooltipGap)
                : point.yInvested - tooltipHeight - tooltipGap;
              const textBaseY = positionBelow ? tooltipY + 18 : tooltipY + 13;

              return (
                <g key={`point-${point.idx}`}>
                  <circle
                    cx={point.x}
                    cy={point.yInvested}
                    r={hoveredIndex === point.idx ? 6 : 4}
                    fill="#3b82f6"
                    opacity={hoveredIndex === point.idx ? 1 : 0.8}
                    onClick={() => !isDrillMode && onDrill(point.label)}
                    style={{
                      cursor: !isDrillMode ? "pointer" : "default",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={() => setHoveredIndex(point.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  <circle
                    cx={point.x}
                    cy={point.yReturn}
                    r={hoveredIndex === point.idx ? 6 : 4}
                    fill="#10b981"
                    opacity={hoveredIndex === point.idx ? 1 : 0.8}
                    onClick={() => !isDrillMode && onDrill(point.label)}
                    style={{
                      cursor: !isDrillMode ? "pointer" : "default",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={() => setHoveredIndex(point.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  {hoveredIndex === point.idx && (
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
                        y={textBaseY}
                        textAnchor="middle"
                        style={{ fontSize: 12, fontWeight: 700, fill: "#fff" }}
                      >
                        {point.label}
                      </text>
                      <text
                        x={tooltipX + 12}
                        y={textBaseY + 16}
                        style={{ fontSize: 10, fill: "#e5e7eb" }}
                      >
                        <tspan fontWeight="600">Invested:</tspan>
                      </text>
                      <text
                        x={tooltipX + tooltipWidth - 12}
                        y={textBaseY + 16}
                        textAnchor="end"
                        style={{
                          fontSize: 10,
                          fill: "#3b82f6",
                          fontWeight: 700,
                        }}
                      >
                        {formatValue(point.invested)}
                      </text>
                      <text
                        x={tooltipX + 12}
                        y={textBaseY + 32}
                        style={{ fontSize: 10, fill: "#e5e7eb" }}
                      >
                        <tspan fontWeight="600">Return:</tspan>
                      </text>
                      <text
                        x={tooltipX + tooltipWidth - 12}
                        y={textBaseY + 32}
                        textAnchor="end"
                        style={{
                          fontSize: 10,
                          fill: "#10b981",
                          fontWeight: 700,
                        }}
                      >
                        {formatValue(point.return)}{" "}
                        {point.invested > 0
                          ? `(${((point.return / point.invested) * 100).toFixed(1)}%)`
                          : ""}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </Box>

        <Box sx={{ flex: 1, minWidth: 220 }}>
          {hoveredIndex !== null && data[hoveredIndex] ? (
            <Box
              sx={{
                p: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
                overflowY: "auto",
                maxHeight: 400,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {data[hoveredIndex].label}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "#3b82f6",
                  display: "block",
                  mb: 1,
                }}
              >
                Invested
              </Typography>
              <Stack
                spacing={0.75}
                sx={{
                  mb: 2,
                  pb: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {Object.entries(data[hoveredIndex].investedBreakdown)
                  .filter(([, value]) => value > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, value]) => (
                    <Box
                      key={`inv-${category}`}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: categoryColors[category],
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {categoryLabelMap[category] || category}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, flexShrink: 0 }}
                      >
                        {formatValue(value)}
                      </Typography>
                    </Box>
                  ))}
              </Stack>

              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "#10b981",
                  display: "block",
                  mb: 1,
                }}
              >
                Return
              </Typography>
              <Stack spacing={0.75}>
                {Object.entries(data[hoveredIndex].returnBreakdown)
                  .filter(([, value]) => value !== 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, value]) => {
                    const investedAmount =
                      data[hoveredIndex].investedBreakdown[category] || 0;
                    const returnPct =
                      investedAmount > 0
                        ? ((value / investedAmount) * 100).toFixed(1)
                        : 0;

                    return (
                      <Box
                        key={`ret-${category}`}
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: categoryColors[category],
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            {categoryLabelMap[category] || category}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            flexShrink: 0,
                            color: value >= 0 ? "#10b981" : "#ef4444",
                          }}
                        >
                          {formatValue(value)} ({returnPct}%)
                        </Typography>
                      </Box>
                    );
                  })}
              </Stack>
            </Box>
          ) : (
            <Box
              sx={{
                p: 1.5,
                bgcolor: "action.hover",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                textAlign: "center",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Hover over a data point to see the breakdown
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 3, pt: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 24, height: 2, backgroundColor: "#3b82f6" }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Invested
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 2,
              backgroundColor: "#10b981",
              backgroundImage:
                "repeating-linear-gradient(90deg, #10b981 0px, #10b981 4px, transparent 4px, transparent 8px)",
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Return
          </Typography>
        </Box>
      </Box>

      {!isDrillMode && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: "center" }}
        >
          Hover to see category breakdown • Click a point to see monthly detail
        </Typography>
      )}
    </Stack>
  );
}
