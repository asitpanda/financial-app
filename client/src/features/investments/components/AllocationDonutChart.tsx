import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
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

interface AllocationDonutChartProps {
  data: InvestmentAllocationSegment[];
  total: number;
  formatValue: (value: number) => string;
}

export default function AllocationDonutChart({
  data,
  total,
  formatValue,
}: AllocationDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 50;
  const gap = 0.018;

  const safeTotal = Math.max(total, 1);
  let cumAngle = -Math.PI / 2;

  const segments = data.map((item, index) => {
    const fraction = item.value / safeTotal;
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
      color: DONUT_PALETTE[index % DONUT_PALETTE.length],
      fraction,
    };
  });

  const active = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        gap: 3,
      }}
    >
      <Box sx={{ flexShrink: 0, position: "relative" }}>
        <svg width={size} height={size} style={{ display: "block" }}>
          {segments.map((segment, index) => (
            <path
              key={segment.label}
              d={segment.d}
              fill={segment.color}
              opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            style={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }}
          >
            {active ? active.label.slice(0, 12) : "Total"}
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
            {active ? formatValue(active.value) : formatValue(total)}
          </text>
        </svg>
      </Box>

      <Stack spacing={0.75} sx={{ flex: 1, width: "100%" }}>
        {segments.map((segment, index) => (
          <Box
            key={segment.label}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              cursor: "default",
              opacity: activeIndex === null || activeIndex === index ? 1 : 0.45,
              transition: "opacity 0.15s",
              backgroundColor:
                activeIndex === index ? "action.hover" : "transparent",
            }}
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
              sx={{ fontWeight: 500 }}
            >
              {(segment.fraction * 100).toFixed(1)}%
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}
            >
              {formatValue(segment.value)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
