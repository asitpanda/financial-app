import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import type { InvestmentAllocationSegment } from "../investments.selectors";

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

const POSITIVE_RETURN_PALETTE = ["#0f766e", "#10b981", "#14b8a6", "#22c55e", "#06b6d4"];
const NEGATIVE_RETURN_PALETTE = ["#ef4444", "#f97316", "#fb7185", "#dc2626", "#f59e0b"];

type AllocationMode = "invested" | "return";

interface AllocationDonutChartProps {
  data: InvestmentAllocationSegment[];
  total: number;
  formatValue: (value: number) => string;
  returnData?: InvestmentAllocationSegment[];
  onSelectSegment?: (
    segment: InvestmentAllocationSegment,
    mode: AllocationMode,
  ) => void;
}

export default function AllocationDonutChart({
  data,
  total,
  formatValue,
  returnData,
  onSelectSegment,
}: AllocationDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<AllocationMode>("invested");
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 50;
  const gap = 0.018;

  const hasReturnMode = Array.isArray(returnData) && returnData.length > 0;
  const dataset = mode === "return" && hasReturnMode ? returnData : data;
  const totalFromData = dataset.reduce(
    (sum, item) => sum + Math.abs(Number(item.value || 0)),
    0,
  );
  const resolvedTotal = Math.max(totalFromData || Math.abs(total) || 1, 1);
  const netReturn = hasReturnMode
    ? returnData!.reduce((sum, item) => sum + Number(item.value || 0), 0)
    : 0;
  let cumAngle = -Math.PI / 2;
  let positiveIndex = 0;
  let negativeIndex = 0;

  const segments = dataset.map((item, index) => {
    const numericValue = Number(item.value || 0);
    const magnitude = Math.abs(numericValue);
    const fraction = magnitude / resolvedTotal;
    const sweep = fraction * 2 * Math.PI - gap;
    const startAngle = cumAngle + gap / 2;
    const endAngle = startAngle + sweep;
    cumAngle += fraction * 2 * Math.PI;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");

    return {
      ...item,
      d,
      color:
        mode === "return"
          ? numericValue >= 0
            ? POSITIVE_RETURN_PALETTE[
                positiveIndex++ % POSITIVE_RETURN_PALETTE.length
              ]
            : NEGATIVE_RETURN_PALETTE[
                negativeIndex++ % NEGATIVE_RETURN_PALETTE.length
              ]
          : DONUT_PALETTE[index % DONUT_PALETTE.length],
      fraction,
      numericValue,
    };
  });

  const active = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <Stack spacing={2} sx={{ width: "100%", minWidth: 0, alignItems: "stretch" }}>
      <Stack spacing={1} sx={{ width: "100%", alignItems: "center" }}>
        {hasReturnMode ? (
          <Box
            sx={{
              display: "inline-flex",
              gap: 0.5,
              p: 0.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <AppButton
              size="small"
              variant={mode === "invested" ? "contained" : "text"}
              onClick={() => {
                setMode("invested");
                setActiveIndex(null);
              }}
              sx={{ minWidth: 82 }}
            >
              Invested
            </AppButton>
            <AppButton
              size="small"
              variant={mode === "return" ? "contained" : "text"}
              onClick={() => {
                setMode("return");
                setActiveIndex(null);
              }}
              sx={{ minWidth: 82 }}
            >
              Return
            </AppButton>
          </Box>
        ) : null}

        <Box sx={{ flexShrink: 0, position: "relative", alignSelf: "center" }}>
          <svg width={size} height={size} style={{ display: "block" }}>
            {segments.map((segment, index) => (
              <path
                key={segment.label}
                d={segment.d}
                fill={segment.color}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                style={{ cursor: onSelectSegment ? "pointer" : "default", transition: "opacity 0.15s" }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => onSelectSegment?.(segment, mode)}
              />
            ))}
            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              style={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }}
            >
              {active
                ? active.label.slice(0, 12)
                : mode === "return"
                  ? "Net Return"
                  : "Total"}
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              style={{ fontSize: 12, fill: "#111827", fontWeight: 700 }}
            >
              {active ? `${(active.fraction * 100).toFixed(1)}%` : "100%"}
            </text>
            <text
              x={cx}
              y={cy + 26}
              textAnchor="middle"
              style={{ fontSize: 10, fill: "#6b7280" }}
            >
              {active
                ? `${active.numericValue >= 0 ? "+" : ""}${formatValue(active.numericValue)}`
                : mode === "return"
                  ? `${netReturn >= 0 ? "+" : ""}${formatValue(netReturn)}`
                  : formatValue(totalFromData || total)}
            </text>
          </svg>
        </Box>
      </Stack>

      <Stack
        spacing={0.75}
        sx={{
          width: "100%",
          minWidth: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {mode === "return"
            ? "Return mode sizes categories by absolute gain or loss and colors them by contribution direction."
            : "Invested mode shows how principal is distributed across categories."}
        </Typography>
        {segments.map((segment, index) => (
          <Box
            key={segment.label}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            sx={{
              display: "grid",
              gridTemplateColumns: "12px minmax(0, 1fr) auto auto",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              cursor: onSelectSegment ? "pointer" : "default",
              opacity: activeIndex === null || activeIndex === index ? 1 : 0.45,
              transition: "opacity 0.15s",
              backgroundColor:
                activeIndex === index ? "action.hover" : "transparent",
            }}
            onClick={() => onSelectSegment?.(segment, mode)}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: segment.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
              {segment.label}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, whiteSpace: "nowrap" }}
            >
              {(segment.fraction * 100).toFixed(1)}%
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}
            >
              {mode === "return" && segment.numericValue > 0 ? "+" : ""}
              {formatValue(mode === "return" ? segment.numericValue : segment.value)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
