import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import {
  mdiCalendarClockOutline,
  mdiShieldCheckOutline,
  mdiTrendingUp,
} from "@mdi/js";
import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AppButton from "../../../components/common/AppButton";
import { KpiCard, SectionCard } from "../../../components/common";
import AllocationDonutChart from "./AllocationDonutChart";
import InvestmentsAssetsView from "./InvestmentsAssetsView";
import CategoryPerformanceTable from "./CategoryPerformanceTable";
import PortfolioGrowthChart from "./PortfolioGrowthChart";
import SourceOfValueCard from "./SourceOfValueCard";
import TimeSeriesVisualization from "./TimeSeriesVisualization";
import {
  formatInvestmentDate,
  getInvestmentCategoryLabel,
} from "../../../utils/investmentHelpers";
import type { Investment } from "../types/investment.types";
import type { InvestmentAssetTaxonomyNode } from "../types/investmentAssetTaxonomy.types";
import type { GridColDef } from "@mui/x-data-grid";
import type {
  InvestmentAllocationSegment,
  InvestmentCategoryPerformanceRow,
  InvestmentContributionViewItem,
  InvestmentDashboardKpis,
  InvestmentPortfolioGrowthPoint,
  InvestmentSeriesPoint,
  InvestmentValueSourceSummary,
} from "../investments.selectors";

interface InvestmentDashboardViewProps {
  investments: Investment[];
  portfolioGrowthData: InvestmentPortfolioGrowthPoint[];
  timeSeriesData: InvestmentSeriesPoint[];
  isDrillMode: boolean;
  onDrillYear: (label: string) => void;
  onResetDrill: () => void;
  dashboardKpis: InvestmentDashboardKpis;
  categoryBreakdown: InvestmentAllocationSegment[];
  categoryLabelMap: Record<string, string>;
  valueSourceSummary: InvestmentValueSourceSummary;
  categoryPerformanceRows: InvestmentCategoryPerformanceRow[];
  topCurrentValueItems: Investment[];
  upcomingContributions: InvestmentContributionViewItem[];
  recentInvestments: Investment[];
  taxonomyNodes: InvestmentAssetTaxonomyNode[];
  columns: readonly GridColDef<Investment>[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categoryOptions: Array<{ value: string; label: string }>;
  onResetFilters: () => void;
  onCreateInvestment: () => void;
  onRecordContribution: (
    investment: Investment,
    contributionPlan: NonNullable<Investment["activeContributionPlan"]>,
  ) => void;
  formatCurrency: (value: number) => string;
}

export default function InvestmentsDashboardView({
  investments,
  portfolioGrowthData,
  timeSeriesData,
  isDrillMode,
  onDrillYear,
  onResetDrill,
  dashboardKpis,
  categoryBreakdown,
  categoryLabelMap,
  valueSourceSummary,
  categoryPerformanceRows,
  topCurrentValueItems,
  upcomingContributions,
  recentInvestments,
  taxonomyNodes,
  columns,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  onResetFilters,
  onCreateInvestment,
  onRecordContribution,
  formatCurrency,
}: InvestmentDashboardViewProps) {
  const focusedSectionRef = useRef<HTMLDivElement | null>(null);
  const [focusedAssetIds, setFocusedAssetIds] = useState<Array<string | number> | null>(null);
  const [focusedAssetTitle, setFocusedAssetTitle] = useState("All Assets");
  const [focusedAssetDescription, setFocusedAssetDescription] = useState(
    "Click the dashboard widgets above to focus a matching slice of the portfolio.",
  );
  const widgetCardSx = {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  } as const;
  const widgetContentSx = {
    flex: 1,
    minHeight: 0,
    maxHeight: { xs: "none", lg: 560 },
    overflowY: { xs: "visible", lg: "auto" },
    pr: { lg: 0.5 },
  } as const;

  const allocationReturnBreakdown = useMemo(
    () =>
      categoryPerformanceRows
        .filter((row) => Number(row.returnAmount || 0) !== 0)
        .map((row) => ({
          key: row.key,
          label: row.label,
          value: row.returnAmount,
          investmentIds: row.investmentIds,
        }))
        .sort((left, right) => Math.abs(right.value) - Math.abs(left.value)),
    [categoryPerformanceRows],
  );

  const focusedInvestments = useMemo(() => {
    if (!focusedAssetIds) {
      return investments;
    }

    const focusSet = new Set(focusedAssetIds);
    return investments.filter((item) => focusSet.has(item.id));
  }, [focusedAssetIds, investments]);

  const focusedFilteredInvestments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return focusedInvestments.filter((investment) => {
      const matchesSearch =
        !query ||
        [investment.name, investment.type, investment.institution, investment.referenceNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" || investment.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || investment.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [focusedInvestments, search, statusFilter, categoryFilter]);

  useEffect(() => {
    if (!focusedAssetIds || !focusedSectionRef.current) {
      return;
    }

    focusedSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [focusedAssetIds, focusedAssetTitle]);

  if (investments.length === 0) {
    return (
      <Stack spacing={2}>
        <SectionCard
          title="Investment Dashboard"
          subtitle="Track long-term assets, contributions, and maturity timelines from one place."
          empty
          emptyState={{
            title: "No investments added yet",
            description:
              "Add your first investment to unlock portfolio insights, allocation mix, and scheduled contribution tracking.",
            actionLabel: "Add Investment",
            onAction: onCreateInvestment,
          }}
        >
          <Box />
        </SectionCard>
      </Stack>
    );
  }

  const focusAssets = (
    investmentIds: Array<string | number>,
    title: string,
    description: string,
  ) => {
    setFocusedAssetIds(investmentIds);
    setFocusedAssetTitle(title);
    setFocusedAssetDescription(description);
  };

  const clearFocusedAssets = () => {
    setFocusedAssetIds(null);
    setFocusedAssetTitle("All Assets");
    setFocusedAssetDescription(
      "Click the dashboard widgets above to focus a matching slice of the portfolio.",
    );
  };

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        <KpiCard
          title="Total Invested Amount"
          value={formatCurrency(dashboardKpis.totalInvested)}
          icon={<Icon path={mdiTrendingUp} size={1} />}
        />
        <Paper
          sx={{
            p: 2,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "text.secondary" }}
            >
              Current Portfolio Value
            </Typography>
            <Icon path={mdiTrendingUp} size={0.9} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>
            {formatCurrency(dashboardKpis.totalCurrentValue)}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: dashboardKpis.totalReturn >= 0 ? "#10b981" : "#ef4444",
              }}
            >
              {dashboardKpis.totalReturn >= 0 ? "+" : ""}
              {formatCurrency(dashboardKpis.totalReturn)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color:
                  dashboardKpis.returnPercentage >= 0 ? "#10b981" : "#ef4444",
              }}
            >
              ({dashboardKpis.returnPercentage >= 0 ? "+" : ""}
              {dashboardKpis.returnPercentage.toFixed(2)}%)
            </Typography>
          </Box>
        </Paper>
        <KpiCard
          title="Upcoming Maturity"
          value={formatCurrency(dashboardKpis.upcomingMaturity)}
          icon={<Icon path={mdiCalendarClockOutline} size={1} />}
        />
        <KpiCard
          title="Insurance Cover"
          value={formatCurrency(dashboardKpis.insuranceCover)}
          icon={<Icon path={mdiShieldCheckOutline} size={1} />}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.7fr) minmax(320px, 0.9fr)" },
          gap: 2,
        }}
      >
        <SectionCard
          title="Portfolio Growth"
          subtitle="Track cumulative invested amount and current value over time, with the gain or loss spread shaded between them."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
          empty={portfolioGrowthData.length === 0}
          emptyState={{
            title: "No portfolio growth data",
            description:
              "Investments with valid start dates will appear here as your portfolio timeline builds.",
          }}
        >
          <PortfolioGrowthChart
            data={portfolioGrowthData}
            formatValue={formatCurrency}
          />
        </SectionCard>

        <SectionCard
          title="Source of Value"
          subtitle="Break down current portfolio value by snapshots, stored current values, and invested-only fallback."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
        >
          <SourceOfValueCard
            summary={valueSourceSummary}
            formatValue={formatCurrency}
            onSelectSource={({ label, investmentIds }) =>
              focusAssets(
                investmentIds,
                label,
                `${label} assets based on how their current value was derived.`,
              )
            }
            onSelectStaleValuations={(investmentIds) =>
              focusAssets(
                investmentIds,
                "Stale Valuations",
                "Active holdings whose valuation basis is older than 90 days.",
              )
            }
          />
        </SectionCard>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(320px, 0.9fr) minmax(0, 1.7fr)" },
          gap: 2,
        }}
      >
        <SectionCard
          title="Category Performance"
          subtitle="Compare invested base, current value, and 6-month trend by category."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
          empty={categoryPerformanceRows.length === 0}
          emptyState={{
            title: "No category performance yet",
            description: "Add investments to compare category-level movement.",
          }}
        >
          <CategoryPerformanceTable
            rows={categoryPerformanceRows}
            formatValue={formatCurrency}
            onSelectRow={(row) =>
              focusAssets(
                row.investmentIds,
                `${row.label} Category`,
                `Assets contributing to ${row.label} performance and trend.`,
              )
            }
          />
        </SectionCard>

        <SectionCard
          title="Investment Deployment Timeline"
          subtitle="Distribution of capital added by fiscal period. Click year to see monthly breakdown."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
          empty={timeSeriesData.length === 0}
          emptyState={{
            title: "No investment timeline data",
            description:
              "Investments with valid start dates will appear here over time.",
          }}
        >
          <TimeSeriesVisualization
            data={timeSeriesData}
            onDrill={onDrillYear}
            onBack={onResetDrill}
            isDrillMode={isDrillMode}
            formatValue={formatCurrency}
            categoryLabelMap={categoryLabelMap}
          />
        </SectionCard>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <SectionCard
          title="Allocation Mix"
          subtitle="Where the current invested base is concentrated."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
          empty={categoryBreakdown.length === 0}
          emptyState={{
            title: "No allocation data",
            description: "Add investments to see category-level concentration.",
            actionLabel: "Add Investment",
            onAction: onCreateInvestment,
          }}
        >
          <AllocationDonutChart
            data={categoryBreakdown}
            total={categoryBreakdown.reduce(
              (sum, item) => sum + Number(item.value || 0),
              0,
            )}
            returnData={allocationReturnBreakdown}
            formatValue={formatCurrency}
            onSelectSegment={(segment, mode) =>
              focusAssets(
                segment.investmentIds,
                mode === "return"
                  ? `${segment.label} Return Contribution`
                  : `${segment.label} Allocation`,
                mode === "return"
                  ? `Assets contributing to the ${segment.label} gain or loss profile.`
                  : `Assets contributing to the ${segment.label} allocation mix.`,
              )
            }
          />
        </SectionCard>

        <SectionCard
          title="Upcoming Contributions"
          subtitle="Scheduled recurring payments due on active investments."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
          empty={upcomingContributions.length === 0}
          emptyState={{
            title: "No upcoming contributions",
            description:
              "Active investments with recurring schedules will appear here.",
          }}
        >
          <List disablePadding>
            {upcomingContributions.map((item, index) => (
              <Fragment key={`${item.id}-contribution-top`}>
                {index > 0 ? <Divider /> : null}
                <ListItem
                  disableGutters
                  onClick={() =>
                    focusAssets(
                      [item.id],
                      item.name,
                      "Focused from the upcoming contributions widget.",
                    )
                  }
                  sx={{ py: 1.25, cursor: "pointer" }}
                >
                  <ListItemText
                    disableTypography
                    primary={
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          mt: 0.25,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {item.institution} •{" "}
                          {item.activeContributionPlan &&
                          item.activeContributionPlan.cadenceInterval > 1
                            ? `every ${item.activeContributionPlan.cadenceInterval} `
                            : ""}
                          {item.activeContributionPlan?.cadenceUnit || ""}
                        </Typography>
                        <Chip
                          size="small"
                          label={item.dueLabel}
                          color={item.dueTone}
                          sx={{ height: 18, fontSize: 11 }}
                        />
                      </Box>
                    }
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      ml: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(item.activeContributionPlan?.amount || 0)}
                    </Typography>
                    <AppButton
                      size="small"
                      variant="contained"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!item.activeContributionPlan) return;
                        onRecordContribution(item, item.activeContributionPlan);
                      }}
                      sx={{ minWidth: 80, height: 28 }}
                    >
                      Record
                    </AppButton>
                  </Box>
                </ListItem>
              </Fragment>
            ))}
          </List>
        </SectionCard>

        <SectionCard
          title="Current Value Snapshot"
          subtitle="Highest-value assets based on the latest stored values."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
          empty={topCurrentValueItems.length === 0}
          emptyState={{
            title: "No current value snapshot",
            description:
              "Assets with captured current values will surface here.",
          }}
        >
          <List disablePadding>
            {topCurrentValueItems.map((item, index) => (
              <Fragment key={item.id}>
                {index > 0 ? <Divider /> : null}
                <ListItem
                  disableGutters
                  onClick={() =>
                    focusAssets(
                      [item.id],
                      item.name,
                      "Focused from the current value snapshot widget.",
                    )
                  }
                  sx={{ py: 1.5, cursor: "pointer" }}
                >
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                    }
                    secondary={`${item.institution} • ${item.type} • ${formatInvestmentDate(item.lastValuationAt || item.startDate)}`}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency(item.currentValue || item.totalInvested)}
                  </Typography>
                </ListItem>
              </Fragment>
            ))}
          </List>
        </SectionCard>

        <SectionCard
          title="Recent Investments"
          subtitle="The latest additions to the organizer."
          sx={widgetCardSx}
          contentSx={widgetContentSx}
          empty={recentInvestments.length === 0}
          emptyState={{
            title: "No investments added yet",
            actionLabel: "Add Investment",
            onAction: onCreateInvestment,
          }}
        >
          <Stack spacing={1.25}>
            {recentInvestments.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                onClick={() =>
                  focusAssets(
                    [item.id],
                    item.name,
                    "Focused from the recent investments widget.",
                  )
                }
                sx={{ p: 1.5, borderRadius: 1, cursor: "pointer" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {item.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.25 }}
                    >
                      {item.institution} • {item.type}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.75,
                        mt: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip size="small" label={item.status || "Active"} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={getInvestmentCategoryLabel(
                          item.category,
                          taxonomyNodes as never[],
                        )}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {formatCurrency(item.totalInvested)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Added{" "}
                      {formatInvestmentDate(item.createdAt || item.startDate)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </SectionCard>
      </Box>

      <Box ref={focusedSectionRef} sx={{ scrollMarginTop: 88 }}>
        <InvestmentsAssetsView
          filteredInvestments={focusedFilteredInvestments}
          columns={columns}
          search={search}
          onSearchChange={onSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={onCategoryFilterChange}
          categoryOptions={categoryOptions}
          onResetFilters={onResetFilters}
          onCreateInvestment={onCreateInvestment}
          isFirstInvestmentSetup={investments.length === 0}
          showSummaryCards={false}
          title={focusedAssetIds ? focusedAssetTitle : "Investment Assets"}
          subtitle={
            focusedAssetIds
              ? `${focusedAssetDescription} Showing ${focusedFilteredInvestments.length} of ${focusedInvestments.length} focused asset${focusedInvestments.length === 1 ? "" : "s"}.`
              : "Primary CRUD workspace for all holdings, contribution schedules, maturity dates, attached notes, and widget-driven drill-down."
          }
          action={
            focusedAssetIds ? (
              <AppButton size="small" variant="outlined" onClick={clearFocusedAssets}>
                Show All
              </AppButton>
            ) : null
          }
        />
      </Box>
    </Stack>
  );
}
