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

export default function CategoryPerformanceTable({
  rows,
  subRows,
  holdingRows,
  formatValue,
  onSelectRow,
}: CategoryPerformanceTableProps) {
  const [drilledType, setDrilledType] = useState<string | null>(null);
  const [drilledCategory, setDrilledCategory] = useState<string | null>(null);

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
    : rows;

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
      </Box>

      {visibleRows.map((row) => {
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
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.3fr) 0.9fr 0.9fr 0.8fr" },
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
                    borderColor: "primary.main",
                    backgroundColor: "action.hover",
                  }
                : undefined,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography noWrap title={row.label} sx={{ minWidth: 0, fontWeight: 700 }}>
                  {row.label}
                </Typography>
                {hasDrillChildren && (
                  <Icon path={mdiChevronRight} size={0.65} style={{ opacity: 0.5, flexShrink: 0 }} />
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
          </Box>
        );
      })}
    </Stack>
  );
}