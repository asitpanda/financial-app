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
  getCadenceLabel,
  getInvestmentStatusTone,
  getInvestmentTypeLabel,
} from "../../../utils/investmentHelpers";
import type { Investment, InvestmentAssetTypeConfig } from "../types/investment.types";
import { getProfitLossMuiColor } from "../../../colors";

const getInvestmentReturnMetrics = (investment: Investment) => {
  const investedValue = Number(investment?.totalInvested || 0);
  const currentValue = Number(investment?.currentValue || 0);

  if (currentValue <= 0 || investedValue <= 0) {
    return null;
  }

  const returnAmount = currentValue - investedValue;
  const returnPercentage = (returnAmount / investedValue) * 100;

  return {
    returnAmount,
    returnPercentage,
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
    headerName: "Name",
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
    field: "contributionType",
    headerName: "Plan Type",
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
          {row.activeContributionPlan ? "Recurring" : "One-time"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.activeContributionPlan
            ? getCadenceLabel(
                row.activeContributionPlan.cadenceUnit,
                row.activeContributionPlan.cadenceInterval,
              )
            : "No active schedule"}
        </Typography>
      </Box>
    ),
  },
  {
    field: "totalInvested",
    headerName: "Invested",
    width: 150,
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
          {formatInvestmentCurrency(row.totalInvested)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.currentValue
            ? `Current ${formatInvestmentCurrency(row.currentValue)}`
            : "No current value"}
        </Typography>
      </Box>
    ),
  },
  {
    field: "type",
    headerName: "Asset Type",
    flex: 1,
    minWidth: 145,
    renderCell: ({ row }) => {
      const typeCode = String(row.assetType || row.type || "");
      const typeLabel = assetTypeLabelByCode[typeCode] || getInvestmentTypeLabel(typeCode);
      const categoryLabel = row.assetCategory
        ? assetCategoryLabelByCode[row.assetCategory] ?? row.assetCategory
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
            {typeLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {categoryLabel}
          </Typography>
        </Box>
      );
    },
  },
  {
    field: "return",
    headerName: "Return",
    flex: 1,
    minWidth: 190,
    sortable: false,
    renderCell: ({ row }) => {
      const metrics = getInvestmentReturnMetrics(row);
      const returnTone =
        metrics == null
          ? "text.secondary"
          : getProfitLossMuiColor(metrics.returnAmount);

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
          <Typography variant="body2" sx={{ fontWeight: 700, color: returnTone }}>
            {metrics ? formatInvestmentCurrency(metrics.returnAmount) : "Not available"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {metrics
              ? `${metrics.returnPercentage >= 0 ? "+" : ""}${metrics.returnPercentage.toFixed(1)}% vs invested`
              : "Waiting for cost and value"}
          </Typography>
        </Box>
      );
    },
  },
  {
    field: "upcomingContribution",
    headerName: "Upcoming Contribution",
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
          {row.activeContributionPlan?.nextDueDate
            ? formatInvestmentDate(row.activeContributionPlan.nextDueDate)
            : "Not scheduled"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.activeContributionPlan
            ? `Amount ${formatInvestmentCurrency(row.activeContributionPlan.amount || 0)}`
            : "No recurring plan"}
        </Typography>
      </Box>
    ),
  },
  {
    field: "maturityDate",
    headerName: "Maturity",
    flex: 1,
    minWidth: 160,
    sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography variant="body2">{formatInvestmentDate(row.maturityDate)}</Typography>
      </Box>
    ),
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    renderCell: ({ row }) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <StatusChip label={row.status} tone={getInvestmentStatusTone(row.status)} />
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
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
