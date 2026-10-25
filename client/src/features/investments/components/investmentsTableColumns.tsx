import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiEyeOutline, mdiPencilOutline } from "@mdi/js";
import { Box, IconButton, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { StatusChip } from "../../../components/common";
import {
  buildAssetCategoryLabelMap,
  buildAssetTypeLabelMap,
  formatInvestmentCurrency,
  formatInvestmentDate,
  getInvestmentStatusTone,
  getInvestmentTypeLabel,
} from "../../../utils/investmentHelpers";
import type {
  Investment,
  InvestmentAssetTypeConfig,
} from "../types/investment.types";
import { getProfitLossMuiColor } from "../../../colors";

const getInvestmentReturnMetrics = (investment: Investment) => {
  if (
    investment.accountingTreatment === "PROTECTION_EXPENSE" ||
    investment.accountingTreatment === "INSURANCE_SAVINGS"
  ) {
    return null;
  }

  if (
    investment?.gainLossAmount == null ||
    investment?.gainLossPercentage == null
  ) {
    return null;
  }

  return {
    returnAmount: investment.gainLossAmount,
    returnPercentage: investment.gainLossPercentage,
  };
};

interface InvestmentColumnsParams {
  onView: (investment: Investment) => void;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  assetTypeConfigs?: InvestmentAssetTypeConfig[];
}

export const getInvestmentsTableColumns = ({
  onView,
  onEdit,
  onDelete,
  assetTypeConfigs = [],
}: InvestmentColumnsParams): GridColDef<Investment>[] => {
  const assetTypeLabelByCode = buildAssetTypeLabelMap(assetTypeConfigs);
  const assetCategoryLabelByCode = buildAssetCategoryLabelMap(assetTypeConfigs);

  return [
    {
      field: "name",
      headerName: "Investment",
      flex: 1.4,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            height: "100%",
            justifyContent: "center",
            py: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {[row.type, row.institution].filter(Boolean).join(" • ")}
          </Typography>
        </Box>
      ),
    },
    {
      field: "currentValue",
      headerName: "Current Value",
      flex: 1,
      minWidth: 170,
      renderCell: ({ row }) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            height: "100%",
            justifyContent: "center",
            py: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {formatInvestmentCurrency(row.currentValue || 0)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {`Invested ${formatInvestmentCurrency(row.totalInvested || 0)}`}
          </Typography>
        </Box>
      ),
    },
    {
      field: "gainLoss",
      headerName: "Gain / Loss",
      width: 170,
      sortable: false,
      renderCell: ({ row }) => {
        const metrics = getInvestmentReturnMetrics(row);

        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              height: "100%",
              justifyContent: "center",
              py: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: metrics
                  ? getProfitLossMuiColor(metrics.returnAmount)
                  : "inherit",
              }}
            >
              {row.accountingTreatment === "INSURANCE_SAVINGS"
                ? "See benefits"
                : metrics
                  ? formatInvestmentCurrency(metrics.returnAmount)
                  : "Not available"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.accountingTreatment === "INSURANCE_SAVINGS"
                ? "Benefits tracked separately"
                : row.accountingTreatment === "PROTECTION_EXPENSE"
                  ? "Not applicable for protection"
                  : metrics
                    ? `${metrics.returnPercentage >= 0 ? "+" : ""}${metrics.returnPercentage.toFixed(1)}%`
                    : "Waiting for cost and value"}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 190,
      sortable: false,
      renderCell: ({ row }) => {
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              height: "100%",
              justifyContent: "center",
              py: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 700 }}
            >
              <StatusChip
                label={row.status}
                tone={getInvestmentStatusTone(row.status)}
              />
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.lastValuationAt
                ? `Valued ${formatInvestmentDate(row.lastValuationAt)}`
                : "No valuation recorded"}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "allocation",
      headerName: "Allocation",
      flex: 1,
      minWidth: 145,
      sortable: false,
      renderCell: ({ row }) => {
        const typeCode = String(row.assetType || row.type || "");
        const typeLabel =
          assetTypeLabelByCode[typeCode] || getInvestmentTypeLabel(typeCode);
        const categoryLabel = row.assetCategory
          ? (assetCategoryLabelByCode[row.assetCategory] ?? row.assetCategory)
          : "";

        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              height: "100%",
              justifyContent: "center",
              py: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {categoryLabel || "Uncategorized"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[typeLabel, row.currency].filter(Boolean).join(" • ")}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "upcomingContribution",
      headerName: "Next Activity",
      flex: 1,
      minWidth: 175,
      sortable: false,
      renderCell: ({ row }) => (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            height: "100%",
            justifyContent: "center",
            py: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.activeContributionPlan?.status === "active" && row.activeContributionPlan.nextDueDate
              ? formatInvestmentDate(row.activeContributionPlan.nextDueDate)
              : row.maturityDate
                ? `Matures ${formatInvestmentDate(row.maturityDate)}`
                : "No upcoming activity"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.activeContributionPlan?.status === "active"
              ? `Amount ${formatInvestmentCurrency(row.activeContributionPlan.amount || 0)}`
              : row.activeContributionPlan
                ? "Recurring plan paused"
                : "No recurring plan"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      flex: 0.8,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}
        >
          <IconButton
            size="small"
            onClick={() => onView(row)}
            aria-label={`View ${row.name}`}
            sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
          >
            <Icon path={mdiEyeOutline} size={0.8} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onEdit(row)}
            aria-label={`Edit ${row.name}`}
            sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
          >
            <Icon path={mdiPencilOutline} size={0.8} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(row)}
            aria-label={`Delete ${row.name}`}
            sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
          >
            <Icon path={mdiDeleteOutline} size={0.8} />
          </IconButton>
        </Box>
      ),
    },
  ];
};
