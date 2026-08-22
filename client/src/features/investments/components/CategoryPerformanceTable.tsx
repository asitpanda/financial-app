import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import Icon from "@mdi/react";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import type { InvestmentCategoryPerformanceRow } from "../investments.selectors";
import { getProfitLossHexColor } from "../../../colors";

interface CategoryPerformanceTableProps {
  rows: InvestmentCategoryPerformanceRow[];
  subRows?: InvestmentCategoryPerformanceRow[];
  holdingRows?: InvestmentCategoryPerformanceRow[];
  formatValue: (value: number) => string;
  onSelectRow?: (row: InvestmentCategoryPerformanceRow) => void;
}

const TREND_OPTIONS = [
  { value: "3m", label: "3M", months: 3 },
  { value: "6m", label: "6M", months: 6 },
  { value: "1y", label: "1Y", months: 12 },
] as const;

const createSparklinePath = (values: number[], width: number, height: number) => {
  if (values.length === 0) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
};

export default function CategoryPerformanceTable({
  rows,
  subRows,
  holdingRows,
  formatValue,
  onSelectRow,
}: CategoryPerformanceTableProps) {
  const [trendWindow, setTrendWindow] = useState<(typeof TREND_OPTIONS)[number]["value"]>("6m");
  const [drilledType, setDrilledType] = useState<string | null>(null);
  const [drilledCategory, setDrilledCategory] = useState<string | null>(null);
  const selectedTrend = TREND_OPTIONS.find((option) => option.value === trendWindow) || TREND_OPTIONS[1];

  const drilledTypeLabel = drilledType
    ? (rows.find((r) => r.key === drilledType)?.label ?? drilledType)
    : null;
  const drilledCategoryLabel = drilledCategory
    ? ((subRows ?? []).find((r) => r.key === drilledCategory && r.assetType === drilledType)?.label ?? drilledCategory)
    : null;

  const visibleRows = drilledType && drilledCategory
    ? (holdingRows ?? []).filter((r) => r.assetType === drilledType && r.assetCategory === drilledCategory)
    : drilledType
    ? (subRows ?? []).filter((r) => r.assetType === drilledType)
    : rows.slice(0, 6);

  const handleBack = () => {
    if (drilledCategory) {
      setDrilledCategory(null);
    } else {
      setDrilledType(null);
    }
  };

  const handleRowClick = (row: InvestmentCategoryPerformanceRow) => {
    // L2 → L1: type row with category children
    if (!drilledType && subRows?.some((r) => r.assetType === row.key)) {
      setDrilledType(row.key);
      return;
    }
    // L1 → L0: category row with multiple holdings
    if (drilledType && !drilledCategory && row.holdings > 1 && holdingRows?.some(
      (r) => r.assetType === drilledType && r.assetCategory === row.key,
    )) {
      setDrilledCategory(row.key);
      return;
    }
    onSelectRow?.(row);
  };

  return (
    <Stack spacing={1}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        {drilledType ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AppButton
              size="small"
              variant="text"
              onClick={handleBack}
              sx={{ minWidth: 0, px: 0.5 }}
            >
              <Icon path={mdiChevronLeft} size={0.75} />
              Back
            </AppButton>
            <Icon path={mdiChevronRight} size={0.65} style={{ opacity: 0.4 }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, cursor: drilledCategory ? "pointer" : "default", opacity: drilledCategory ? 0.6 : 1 }}
              onClick={drilledCategory ? () => setDrilledCategory(null) : undefined}
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
        ) : (
          <Typography variant="caption" color="text.secondary">
            {subRows && subRows.length > 0
              ? "Click an asset type to see its categories."
              : "Click an asset type row to focus matching assets."}
          </Typography>
        )}
        <Box sx={{ display: "inline-flex", gap: 0.5, p: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          {TREND_OPTIONS.map((option) => {
            const selected = option.value === trendWindow;

            return (
              <AppButton
                key={option.value}
                size="small"
                variant={selected ? "contained" : "text"}
                onClick={() => setTrendWindow(option.value)}
                sx={{ minWidth: 52, px: 1.25 }}
              >
                {option.label}
              </AppButton>
            );
          })}
        </Box>
      </Box>

      {visibleRows.map((row) => {
        const sparklineValues = row.sparkline.slice(-selectedTrend.months);
        const sparklinePath = createSparklinePath(sparklineValues, 96, 28);
        const hasDrillChildren = drilledType
          ? (!drilledCategory && row.holdings > 1 && holdingRows?.some(
              (r) => r.assetType === drilledType && r.assetCategory === row.key,
            ))
          : subRows?.some((r) => r.assetType === row.key);

        return (
          <Box
            key={row.key}
            onClick={() => handleRowClick(row)}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.3fr 0.9fr 0.9fr 0.8fr" },
              gap: 1,
              alignItems: "center",
              p: 1.1,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              cursor: onSelectRow || hasDrillChildren ? "pointer" : "default",
              transition: "border-color 0.15s, background-color 0.15s",
              '&:hover': onSelectRow || hasDrillChildren
                ? {
                    borderColor: "rgba(15, 118, 110, 0.4)",
                    backgroundColor: "rgba(15, 118, 110, 0.04)",
                  }
                : undefined,
            }}
          >
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontWeight: 700 }}>{row.label}</Typography>
                {hasDrillChildren && (
                  <Icon path={mdiChevronRight} size={0.65} style={{ opacity: 0.5 }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {row.holdings} holding{row.holdings === 1 ? "" : "s"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Invested
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatValue(row.invested)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatValue(row.currentValue)}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: getProfitLossHexColor(row.returnAmount, "gain"),
                }}
              >
                {row.returnAmount >= 0 ? "+" : ""}
                {formatValue(row.returnAmount)}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: getProfitLossHexColor(row.returnPercentage, "gain") }}
              >
                {row.returnPercentage >= 0 ? "+" : ""}
                {row.returnPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "2 / -1" }, display: "flex", justifyContent: "flex-end" }}>
              <svg width="96" height="28" viewBox="0 0 96 28" aria-hidden="true">
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke={getProfitLossHexColor(row.returnAmount, "gain")}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}