import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Icon from "@mdi/react";
import {
  mdiAlertCircleOutline,
  mdiCarOutline,
  mdiChevronDown,
  mdiHeartPulse,
  mdiPiggyBankOutline,
  mdiShieldAccountOutline,
  mdiShieldCheckOutline,
  mdiStarOutline,
} from "@mdi/js";
import AppButton from "../../../components/common/AppButton";
import { SectionCard } from "../../../components/common";
import { formatInvestmentDate } from "../../../utils/investmentHelpers";
import {
  getInsurancePositionData,
  type InsurancePositionRow,
} from "../investments.selectors";
import type { Investment } from "../types/investment.types";
import type { InvestmentAssetTaxonomyNode } from "../types/investmentAssetTaxonomy.types";

interface InsurancePositionWidgetProps {
  investments: Investment[];
  taxonomyNodes: InvestmentAssetTaxonomyNode[];
  formatCurrency: (value: number) => string;
  onSelectPolicies?: (
    investmentIds: Array<string | number>,
    title: string,
    description: string,
  ) => void;
  sx?: Record<string, unknown>;
  contentSx?: Record<string, unknown>;
}

type InsuranceFilterTab = "all" | "protection" | "savings" | "dueSoon";

const getCategoryIcon = (categoryKey: string) => {
  const key = String(categoryKey || "").toUpperCase();
  if (key.includes("HEALTH") || key.includes("MEDICLAIM")) {
    return mdiHeartPulse;
  }
  if (key.includes("TERM") || key.includes("LIFE")) {
    return mdiShieldAccountOutline;
  }
  if (key.includes("SAVINGS") || key.includes("ENDOWMENT") || key.includes("MONEY") || key.includes("ULIP")) {
    return mdiPiggyBankOutline;
  }
  if (key.includes("MOTOR") || key.includes("CAR") || key.includes("BIKE") || key.includes("VEHICLE")) {
    return mdiCarOutline;
  }
  return mdiShieldCheckOutline;
};

export default function InsurancePositionWidget({
  investments,
  taxonomyNodes,
  formatCurrency,
  onSelectPolicies,
  sx,
  contentSx,
}: InsurancePositionWidgetProps) {
  const [activeFilter, setActiveFilter] = useState<InsuranceFilterTab>("all");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { summary, categoryRows, policyRows } = useMemo(() => {
    return getInsurancePositionData(investments, taxonomyNodes);
  }, [investments, taxonomyNodes]);

  // Filter policies based on active tab
  const filteredPolicyRows = useMemo(() => {
    switch (activeFilter) {
      case "protection":
        return policyRows.filter((p) => p.treatment === "PROTECTION_EXPENSE");
      case "savings":
        return policyRows.filter((p) => p.treatment === "INSURANCE_SAVINGS");
      case "dueSoon":
        return policyRows.filter(
          (p) => p.dueUrgency === "urgent" || p.dueUrgency === "upcoming",
        );
      default:
        return policyRows;
    }
  }, [policyRows, activeFilter]);

  // Group filtered policies by category
  const filteredCategoryGroups = useMemo(() => {
    const groups: Record<string, { category: InsurancePositionRow; policies: InsurancePositionRow[] }> = {};

    filteredPolicyRows.forEach((policy) => {
      const catKey = policy.categoryKey || "other";
      if (!groups[catKey]) {
        const catInfo = categoryRows.find((c) => c.key === catKey) || {
          key: catKey,
          label: catKey,
          holdingsCount: 0,
          treatment: policy.treatment,
          insuranceCover: 0,
          totalInvestedOrPremium: 0,
          annualPremium: 0,
          expectedBenefits: 0,
          investmentIds: [],
        };
        groups[catKey] = {
          category: catInfo,
          policies: [],
        };
      }
      groups[catKey].policies.push(policy);
    });

    return Object.values(groups);
  }, [filteredPolicyRows, categoryRows]);

  const toggleCategory = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: prev[catKey] !== undefined ? !prev[catKey] : false, // Default is open, toggle closes it
    }));
  };

  const isCategoryExpanded = (catKey: string) => {
    return expandedCategories[catKey] !== false; // Default expanded
  };

  const handlePolicyClick = (policy: InsurancePositionRow) => {
    onSelectPolicies?.(
      policy.investmentIds,
      policy.label,
      `Focused on policy ${policy.label}${policy.policyNumber ? ` (${policy.policyNumber})` : ""}.`,
    );
  };

  const getUrgencyBadge = (policy: InsurancePositionRow) => {
    if (!policy.nextDueDate || policy.daysUntilDue == null) {
      return null;
    }
    const days = policy.daysUntilDue;
    const dueLabel =
      days < 0
        ? `Overdue by ${Math.abs(days)}d`
        : days === 0
          ? "Due Today"
          : days === 1
            ? "Due Tomorrow"
            : `Due in ${days}d`;

    const color =
      policy.dueUrgency === "urgent"
        ? "error"
        : policy.dueUrgency === "upcoming"
          ? "warning"
          : "default";

    return (
      <Chip
        size="small"
        label={`${dueLabel} (${formatCurrency(policy.nextDueAmount || 0)})`}
        color={color}
        variant={policy.dueUrgency === "urgent" ? "filled" : "outlined"}
        sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
      />
    );
  };

  return (
    <SectionCard
      title="Insurance Position"
      subtitle="Coverage portfolio, premium outflows, and scheduled benefit milestones."
      sx={sx}
      contentSx={contentSx}
      empty={summary.activePoliciesCount === 0}
      emptyState={{
        title: "No insurance policies added",
        description:
          "Add life, health, or protection insurance products to track consolidated cover and premiums.",
      }}
      action={
        <Box
          sx={{
            display: "inline-flex",
            gap: 0.5,
            p: 0.25,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            flexWrap: "wrap",
          }}
        >
          <AppButton
            size="small"
            variant={activeFilter === "all" ? "contained" : "text"}
            onClick={() => setActiveFilter("all")}
            sx={{ minWidth: 54, height: 26, fontSize: "11px", px: 1 }}
          >
            All ({policyRows.length})
          </AppButton>
          <AppButton
            size="small"
            variant={activeFilter === "protection" ? "contained" : "text"}
            onClick={() => setActiveFilter("protection")}
            sx={{ minWidth: 70, height: 26, fontSize: "11px", px: 1 }}
          >
            Protection
          </AppButton>
          <AppButton
            size="small"
            variant={activeFilter === "savings" ? "contained" : "text"}
            onClick={() => setActiveFilter("savings")}
            sx={{ minWidth: 64, height: 26, fontSize: "11px", px: 1 }}
          >
            Savings
          </AppButton>
          {summary.upcomingPremiumsCount > 0 && (
            <AppButton
              size="small"
              variant={activeFilter === "dueSoon" ? "contained" : "text"}
              onClick={() => setActiveFilter("dueSoon")}
              color={summary.urgentPremiumsCount > 0 ? "error" : "primary"}
              sx={{ minWidth: 74, height: 26, fontSize: "11px", px: 1 }}
            >
              {summary.urgentPremiumsCount > 0 && (
                <Icon path={mdiAlertCircleOutline} size={0.55} style={{ marginRight: 3 }} />
              )}
              Due Soon ({summary.upcomingPremiumsCount})
            </AppButton>
          )}
        </Box>
      }
    >
      <Stack spacing={2}>
        {/* Top High-Impact Summary Strip */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, 1fr)",
            },
            gap: 1.5,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: "background.paper",
              borderLeft: "4px solid",
              borderLeftColor: "primary.main",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              TOTAL COVER
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, my: 0.25 }}>
              {formatCurrency(summary.totalCover)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
              {formatCurrency(summary.totalCoverProtection)} prot. • {formatCurrency(summary.totalCoverSavings)} sav.
            </Typography>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: "background.paper",
              borderLeft: "4px solid",
              borderLeftColor: "warning.main",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              ANNUAL PREMIUMS
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, my: 0.25 }}>
              {formatCurrency(summary.annualTotalPremium || summary.totalPremiumsPaid)}
              <Typography component="span" variant="caption" color="text.secondary">
                {summary.annualTotalPremium > 0 ? " / yr" : " paid"}
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
              {formatCurrency(summary.annualProtectionPremium)} expense • {formatCurrency(summary.annualSavingsPremium)} savings
            </Typography>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              backgroundColor: "background.paper",
              borderLeft: "4px solid",
              borderLeftColor: "success.main",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              EXPECTED BENEFITS
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, my: 0.25 }}>
              {formatCurrency(summary.expectedBenefitsTotal)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
              Money-back & maturity schedules
            </Typography>
          </Paper>
        </Box>

        {/* Visual Multi-Segment Coverage Composition Bar */}
        {summary.coverageSegments.length > 0 && (
          <Box sx={{ p: 1.5, backgroundColor: "action.hover", borderRadius: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                COVERAGE COMPOSITION BY CATEGORY
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.coverageSegments.length} active categories
              </Typography>
            </Box>

            {/* Stacked Progress Bar */}
            <Box
              sx={{
                display: "flex",
                height: 10,
                borderRadius: 5,
                overflow: "hidden",
                backgroundColor: "divider",
                mb: 1.25,
              }}
            >
              {summary.coverageSegments.map((seg) => (
                <Tooltip
                  key={seg.key}
                  title={`${seg.label}: ${formatCurrency(seg.coverAmount)} (${seg.percentage.toFixed(1)}%)`}
                  arrow
                >
                  <Box
                    sx={{
                      width: `${seg.percentage}%`,
                      backgroundColor: seg.color,
                      transition: "width 0.3s ease",
                      cursor: "pointer",
                      "&:hover": { opacity: 0.85 },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>

            {/* Legend */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {summary.coverageSegments.map((seg) => (
                <Box key={seg.key} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: seg.color,
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "11px" }}>
                    {seg.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "11px" }}>
                    {formatCurrency(seg.coverAmount)} ({seg.percentage.toFixed(0)}%)
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Grouped Category Accordions */}
        <Stack spacing={1.25}>
          {filteredCategoryGroups.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                No policies match the selected filter.
              </Typography>
            </Paper>
          ) : (
            filteredCategoryGroups.map(({ category, policies }) => {
              const expanded = isCategoryExpanded(category.key);
              const categoryCover = policies.reduce((s, p) => s + p.insuranceCover, 0);
              const categoryAnnualPremium = policies.reduce((s, p) => s + p.annualPremium, 0);

              return (
                <Accordion
                  key={category.key}
                  expanded={expanded}
                  onChange={() => toggleCategory(category.key)}
                  disableGutters
                  variant="outlined"
                  sx={{
                    borderRadius: 1.5,
                    overflow: "hidden",
                    "&:before": { display: "none" },
                    boxShadow: "none",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<Icon path={mdiChevronDown} size={0.8} />}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      backgroundColor: "background.paper",
                      "&.Mui-expanded": { minHeight: 48 },
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        pr: 1,
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              category.treatment === "PROTECTION_EXPENSE"
                                ? "info.light"
                                : "success.light",
                            color:
                              category.treatment === "PROTECTION_EXPENSE"
                                ? "info.dark"
                                : "success.dark",
                          }}
                        >
                          <Icon path={getCategoryIcon(category.key)} size={0.8} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: "14px" }}>
                            {category.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {policies.length} {policies.length === 1 ? "policy" : "policies"}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {categoryCover > 0 && (
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Cover
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {formatCurrency(categoryCover)}
                            </Typography>
                          </Box>
                        )}
                        {categoryAnnualPremium > 0 && (
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Annual Premium
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {formatCurrency(categoryAnnualPremium)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 0 }}>
                    <Divider />
                    <Stack divider={<Divider />}>
                      {policies.map((policy) => (
                        <Box
                          key={policy.key}
                          onClick={() => handlePolicyClick(policy)}
                          sx={{
                            px: 2,
                            py: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                            cursor: "pointer",
                            transition: "background-color 0.15s ease",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          {/* Policy Name & Identity */}
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>
                                {policy.label}
                              </Typography>
                              <Chip
                                size="small"
                                label={
                                  policy.treatment === "PROTECTION_EXPENSE"
                                    ? "Pure Protection"
                                    : "Savings-Linked"
                                }
                                color={policy.treatment === "PROTECTION_EXPENSE" ? "info" : "success"}
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10, fontWeight: 600 }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
                              {[policy.institutionName, policy.policyNumber ? `#${policy.policyNumber}` : null]
                                .filter(Boolean)
                                .join(" • ")}
                            </Typography>
                          </Box>

                          {/* Cover & Benefits */}
                          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {policy.insuranceCover > 0 ? formatCurrency(policy.insuranceCover) : "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {policy.insuranceCover > 0 ? "Sum Assured" : "Cover"}
                            </Typography>
                          </Box>

                          {/* Renewal Status & Milestone Chips */}
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 0.5,
                              flexShrink: 0,
                              minWidth: 140,
                            }}
                          >
                            {getUrgencyBadge(policy)}
                            {policy.nextBenefitLabel && policy.nextBenefitAmount && (
                              <Chip
                                size="small"
                                icon={<Icon path={mdiStarOutline} size={0.5} />}
                                label={`${formatCurrency(policy.nextBenefitAmount)} ${policy.nextBenefitLabel}${policy.nextBenefitDate ? ` (${formatInvestmentDate(policy.nextBenefitDate)})` : ""}`}
                                color="success"
                                variant="outlined"
                                sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                              />
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
