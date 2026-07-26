import { Fragment } from "react";
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
import TimeSeriesVisualization from "./TimeSeriesVisualization";
import {
  formatInvestmentDate,
  getInvestmentCategoryLabel,
} from "../../../utils/investmentHelpers";
import type { Investment } from "../types/investment.types";
import type { InvestmentAssetTaxonomyNode } from "../types/investmentAssetTaxonomy.types";
import type {
  InvestmentAllocationSegment,
  InvestmentContributionViewItem,
  InvestmentDashboardKpis,
  InvestmentSeriesPoint,
} from "../investments.selectors";

interface InvestmentDashboardViewProps {
  investments: Investment[];
  timeSeriesData: InvestmentSeriesPoint[];
  isDrillMode: boolean;
  onDrillYear: (label: string) => void;
  onResetDrill: () => void;
  dashboardKpis: InvestmentDashboardKpis;
  categoryBreakdown: InvestmentAllocationSegment[];
  categoryLabelMap: Record<string, string>;
  topCurrentValueItems: Investment[];
  upcomingContributions: InvestmentContributionViewItem[];
  upcomingMaturityItems: Investment[];
  recentInvestments: Investment[];
  taxonomyNodes: InvestmentAssetTaxonomyNode[];
  onCreateInvestment: () => void;
  onRecordContribution: (
    investment: Investment,
    contributionPlan: NonNullable<Investment["activeContributionPlan"]>,
  ) => void;
  formatCurrency: (value: number) => string;
}

export default function InvestmentsDashboardView({
  investments,
  timeSeriesData,
  isDrillMode,
  onDrillYear,
  onResetDrill,
  dashboardKpis,
  categoryBreakdown,
  categoryLabelMap,
  topCurrentValueItems,
  upcomingContributions,
  upcomingMaturityItems,
  recentInvestments,
  taxonomyNodes,
  onCreateInvestment,
  onRecordContribution,
  formatCurrency,
}: InvestmentDashboardViewProps) {
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

      <SectionCard
        title="Investment Timeline"
        subtitle="Distribution of total invested by category over time. Click year to see monthly breakdown."
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "1.3fr 1fr 1fr" },
          gap: 2,
        }}
      >
        <SectionCard
          title="Current Value Snapshot"
          subtitle="Highest-value assets based on the latest stored values."
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
                <ListItem disableGutters sx={{ py: 1.5 }}>
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
          title="Allocation Mix"
          subtitle="Where the current invested base is concentrated."
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
            total={dashboardKpis.totalInvested}
            formatValue={formatCurrency}
          />
        </SectionCard>

        <SectionCard
          title="Upcoming Contributions"
          subtitle="Scheduled recurring payments due on active investments."
          empty={upcomingContributions.length === 0}
          emptyState={{
            title: "No upcoming contributions",
            description:
              "Active investments with recurring schedules will appear here.",
          }}
        >
          <List disablePadding>
            {upcomingContributions.map((item, index) => (
              <Fragment key={`${item.id}-contribution`}>
                {index > 0 ? <Divider /> : null}
                <ListItem disableGutters sx={{ py: 1.25 }}>
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
                      onClick={() => {
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
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
          gap: 2,
        }}
      >
        <SectionCard
          title="Upcoming Maturity"
          subtitle="Assets nearing maturity or payout windows."
          empty={upcomingMaturityItems.length === 0}
          emptyState={{
            title: "No maturities due",
            description:
              "Maturing deposits, policies, and certificates will appear here.",
          }}
        >
          <List disablePadding>
            {upcomingMaturityItems.map((item, index) => (
              <Fragment key={`${item.id}-maturity-card`}>
                {index > 0 ? <Divider /> : null}
                <ListItem disableGutters sx={{ py: 1.5 }}>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                    }
                    secondary={`${item.institution} • ${item.type} • ${formatInvestmentDate(item.maturityDate)}`}
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
                sx={{ p: 1.5, borderRadius: 1 }}
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
    </Stack>
  );
}
