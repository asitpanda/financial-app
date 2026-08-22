import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import Icon from "@mdi/react";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import type { InvestmentAllocationSegment } from "../investments.selectors";
import {
  getStableSeriesColorMap,
  getProfitLossReadableHexColor,
} from "../../../colors";

type AllocationMode = "invested" | "return";

interface AllocationDonutChartProps {
  data: InvestmentAllocationSegment[];
  total: number;
  formatValue: (value: number) => string;
  returnData?: InvestmentAllocationSegment[];
  subData?: InvestmentAllocationSegment[];
  subReturnData?: InvestmentAllocationSegment[];
  holdingData?: InvestmentAllocationSegment[];
  holdingReturnData?: InvestmentAllocationSegment[];
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
  subData,
  subReturnData,
  holdingData,
  holdingReturnData,
  onSelectSegment,
}: AllocationDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<AllocationMode>("invested");
  const [drilledType, setDrilledType] = useState<string | null>(null);
  const [drilledCategory, setDrilledCategory] = useState<string | null>(null);

  const drilledTypeLabel = drilledType
    ? (data.find((s) => s.key === drilledType)?.label ?? drilledType)
    : null;
  const drilledCategoryLabel = drilledCategory
    ? ((subData ?? []).find((s) => s.key === drilledCategory && s.assetType === drilledType)?.label ?? drilledCategory)
    : null;

  // resolve the active dataset based on drill state and mode
  const resolvedData = drilledType && drilledCategory
    ? (holdingData ?? []).filter((s) => s.assetType === drilledType && s.assetCategory === drilledCategory)
    : drilledType
    ? (subData ?? []).filter((s) => s.assetType === drilledType)
    : data;
  const resolvedReturnData = drilledType && drilledCategory
    ? (holdingReturnData ?? []).filter((s) => s.assetType === drilledType && s.assetCategory === drilledCategory)
    : drilledType
    ? (subReturnData ?? []).filter((s) => s.assetType === drilledType)
    : returnData;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 50;
  const gap = 0.018;

  const hasReturnMode = Array.isArray(resolvedReturnData) && resolvedReturnData.length > 0;
  const dataset = useMemo(() => {
    if (!(mode === "return" && hasReturnMode)) {
      return resolvedData;
    }

    const investedOrder = new Map(
      resolvedData.map((item, index) => [item.key, index]),
    );

    return [...(resolvedReturnData ?? [])].sort((left, right) => {
      const leftOrder = investedOrder.get(left.key);
      const rightOrder = investedOrder.get(right.key);

      if (leftOrder != null && rightOrder != null) return leftOrder - rightOrder;
      if (leftOrder != null) return -1;
      if (rightOrder != null) return 1;
      return String(left.label || left.key).localeCompare(
        String(right.label || right.key),
      );
    });
  }, [mode, hasReturnMode, resolvedData, resolvedReturnData]);
  const totalFromData = dataset.reduce(
    (sum, item) => sum + Math.abs(Number(item.value || 0)),
    0,
  );
  const resolvedTotal = Math.max(totalFromData || Math.abs(total) || 1, 1);
  const netReturn = hasReturnMode
    ? resolvedReturnData!.reduce((sum, item) => sum + Number(item.value || 0), 0)
    : 0;
  const seriesKeys = [
    ...new Set([
      ...resolvedData.map((item) => item.key),
      ...(resolvedReturnData ?? []).map((item) => item.key),
    ]),
  ];
  const colorByKey = getStableSeriesColorMap(
    seriesKeys,
    "investments-allocation-donut",
  );

  const handleSegmentClick = (segment: InvestmentAllocationSegment) => {
    // L2 → L1: type has category children
    if (!drilledType && (subData ?? []).some((s) => s.assetType === segment.key)) {
      setActiveIndex(null);
      setDrilledType(segment.key);
      return;
    }
    // L1 → L0: category has multiple holdings
    if (drilledType && !drilledCategory && (holdingData ?? []).some(
      (s) => s.assetType === drilledType && s.assetCategory === segment.key,
    )) {
      setActiveIndex(null);
      setDrilledCategory(segment.key);
      return;
    }
    onSelectSegment?.(segment, mode);
  };
  let cumAngle = -Math.PI / 2;

  const segments = dataset.map((item) => {
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
      color: colorByKey.get(item.key) ?? "#94a3b8",
      fraction,
      numericValue,
    };
  });

  const active = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <Stack spacing={2} sx={{ width: "100%", minWidth: 0, alignItems: "stretch" }}>
      <Stack spacing={1} sx={{ width: "100%", alignItems: "center" }}>
        {drilledType ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, alignSelf: "flex-start" }}>
            <AppButton
              size="small"
              variant="text"
              onClick={() => {
                setActiveIndex(null);
                if (drilledCategory) {
                  setDrilledCategory(null);
                } else {
                  setDrilledType(null);
                }
              }}
              sx={{ minWidth: 0, px: 0.5 }}
            >
              <Icon path={mdiChevronLeft} size={0.75} />
              Back
            </AppButton>
            <Icon path={mdiChevronRight} size={0.65} style={{ opacity: 0.4 }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, cursor: drilledCategory ? "pointer" : "default", opacity: drilledCategory ? 0.6 : 1 }}
              onClick={drilledCategory ? () => { setActiveIndex(null); setDrilledCategory(null); } : undefined}
            >
              {drilledTypeLabel}
            </Typography>
            {drilledCategory && (
              <>
                <Icon path={mdiChevronRight} size={0.65} style={{ opacity: 0.4 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {drilledCategoryLabel}
                </Typography>
              </>
            )}
          </Box>
        ) : null}
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
                style={{ cursor: onSelectSegment || !drilledType ? "pointer" : "default", transition: "opacity 0.15s" }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onClick={() => handleSegmentClick(segment)}
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
              style={{
                fontSize: 10,
                fill:
                  mode === "return"
                    ? getProfitLossReadableHexColor(
                        active ? active.numericValue : netReturn,
                      )
                    : "#6b7280",
              }}
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
          {drilledCategory
            ? `${drilledTypeLabel} › ${drilledCategoryLabel} holdings — click a segment to focus that investment.`
            : drilledType
            ? `${drilledTypeLabel} categories — click a segment to focus matching assets.`
            : mode === "return"
              ? "Return mode sizes asset types by absolute gain or loss and keeps the same series colors for easier comparison."
              : "Invested mode shows how principal is distributed across asset types."}
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
              cursor: onSelectSegment || !drilledType ? "pointer" : "default",
              opacity: activeIndex === null || activeIndex === index ? 1 : 0.45,
              transition: "opacity 0.15s",
              backgroundColor:
                activeIndex === index ? "action.hover" : "transparent",
            }}
            onClick={() => handleSegmentClick(segment)}
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {segment.label}
              </Typography>
              {!drilledType && (subData ?? []).some((s) => s.assetType === segment.key) && (
                <Icon path={mdiChevronRight} size={0.6} style={{ opacity: 0.45, flexShrink: 0 }} />
              )}
              {drilledType && !drilledCategory && (holdingData ?? []).some(
                (s) => s.assetType === drilledType && s.assetCategory === segment.key,
              ) && (
                <Icon path={mdiChevronRight} size={0.6} style={{ opacity: 0.45, flexShrink: 0 }} />
              )}
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, whiteSpace: "nowrap" }}
            >
              {(segment.fraction * 100).toFixed(1)}%
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                textAlign: "right",
                whiteSpace: "nowrap",
                color:
                  mode === "return"
                    ? getProfitLossReadableHexColor(segment.numericValue)
                    : "text.primary",
              }}
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
