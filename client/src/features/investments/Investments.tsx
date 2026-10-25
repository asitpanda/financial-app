// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import AppDrawer from "../../components/drawers/AppDrawer";
import type { GridSortModel } from "@mui/x-data-grid";
import InvestmentAssetTaxonomyFormDrawer from "./components/InvestmentAssetTaxonomyFormDrawer";
import InvestmentSaveDrawer from "./components/InvestmentSaveDrawer";
import AppButton from "../../components/common/AppButton";
import { EmptyState } from "../../components/common";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";
import { InvestmentViewDrawer } from "./components/InvestmentViewDrawer";
import InvestmentsDashboardView from "./components/InvestmentsDashboardView";
import RecordInvestmentActivityModal from "./components/RecordInvestmentActivityModal";
import { getInvestmentsTableColumns } from "./components/investmentsTableColumns";
import { useHeaderAction } from "../../hooks/useHeaderAction";
import { useNotificationStore } from "../../store/notificationStore";
import {
  formatInvestmentCurrency,
  normalizeInvestmentForUi,
} from "../../utils/investmentHelpers";
import { getRuntimeErrorMessage } from "../../utils/errorMessage";
import {
  useInvestmentDashboardAnalytics,
  useInvestment,
  useInvestmentEventsByInvestment,
  useInvestmentPerformance,
  useInvestmentReferenceData,
  useInvestmentSnapshotsByInvestment,
  useInvestmentSummaryPageData,
  useRemoveInvestment,
} from "./hooks/useInvestments";
import {
  useRemoveInvestmentAssetTaxonomy,
  useSaveInvestmentAssetTaxonomy,
} from "./hooks/useInvestmentAssetTaxonomy";
import {
  getInvestmentSelectedById,
  getNormalizedInvestments,
  getInvestmentContributionViewItems,
  getInvestmentHoldingPerformanceRows,
} from "./investments.selectors";
import type { InvestmentDrawerData } from "./types/investment.types";
import type { InvestmentSummaryPagination } from "./types/investment.types";
import { useInvestmentBenefits } from "./hooks/useInvestmentBenefits";

export {
  mapFrequencyToCadence,
  toDateOnly,
  buildRecurringPayloadFromFormValues,
  buildRecurringPlanUpdatePayloadFromFormValues,
  buildRecurringReviewState,
  buildRecurringConfirmPayload,
} from "../../utils/investmentHelpers";

export default function Investments() {
  const [investmentPage, setInvestmentPage] = useState(1);
  const [investmentPageSize, setInvestmentPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [treatmentFilter, setTreatmentFilter] = useState("all");
  const [focusedAssetIds, setFocusedAssetIds] = useState<Array<string | number> | null>(null);
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [uiError, setUiError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assetTaxonomyDrawerOpen, setAssetTaxonomyDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("create");
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedYearForDrill, setSelectedYearForDrill] = useState(null);
  const [taxonomyFormError, setTaxonomyFormError] = useState("");
  const [recordActivityModalOpen, setRecordActivityModalOpen] = useState(false);
  const [recordActivityMode, setRecordActivityMode] = useState("contribution");
  const [selectedInvestmentActivity, setSelectedInvestmentActivity] = useState(null);
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );
  const removeInvestmentMutation = useRemoveInvestment();
  const saveTaxonomyMutation = useSaveInvestmentAssetTaxonomy();
  const removeTaxonomyMutation = useRemoveInvestmentAssetTaxonomy();
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 500);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const investmentListParams = {
    page: investmentPage,
    limit: investmentPageSize,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    assetType: categoryFilter === "all" ? undefined : categoryFilter,
    accountingTreatment: treatmentFilter === "all" ? undefined : treatmentFilter,
    ids: focusedAssetIds ?? undefined,
    sortBy: sortModel[0]?.field,
    sortDirection: sortModel[0]?.sort ?? undefined,
  };
  const {
    investments: rawInvestments,
    pagination: investmentPagination,
    loading: investmentsLoading,
    error: pageDataError,
  } = useInvestmentSummaryPageData(investmentListParams);
  const {
    taxonomyNodes,
    accounts,
    assetTypeConfigs,
    loading: referenceDataLoading,
    error: referenceDataError,
  } = useInvestmentReferenceData();
  const dashboardEnabled = true;
  const dashboardAnalyticsQuery = useInvestmentDashboardAnalytics(dashboardEnabled);
  const investmentBenefitsQuery = useInvestmentBenefits();
  const investmentBenefitsData = investmentBenefitsQuery.data;
  const loading = investmentsLoading;
  const error =
    uiError ||
    (pageDataError
      ? "Failed to load investments"
      : referenceDataError
        ? "Failed to load investment reference data"
          : investmentBenefitsQuery.error
            ? "Failed to load investment benefits"
        : dashboardEnabled && dashboardAnalyticsQuery.error
          ? "Failed to load investment dashboard"
        : "");

  const summaryInvestments = useMemo(() => {
    if (!Array.isArray(rawInvestments)) return [];

    const investmentBenefits = investmentBenefitsData ?? [];
    const benefitsByInvestmentId = new Map<string, typeof investmentBenefits>();
    for (const benefit of investmentBenefits) {
      const key = String(benefit.investmentId);
      const benefits = benefitsByInvestmentId.get(key) ?? [];
      benefits.push(benefit);
      benefitsByInvestmentId.set(key, benefits);
    }

    return getNormalizedInvestments(rawInvestments, taxonomyNodes).map((investment) => ({
      ...investment,
      benefits: benefitsByInvestmentId.get(String(investment.id)) ?? [],
    }));
  }, [rawInvestments, taxonomyNodes, investmentBenefitsData]);

  const selectedInvestmentSummary = getInvestmentSelectedById(
    summaryInvestments,
    selectedInvestmentId,
  );
  const selectedInvestmentQuery = useInvestment(selectedInvestmentId);
  const investmentDetailEnabled =
    drawerOpen && selectedInvestmentId != null && selectedInvestmentId !== "";
  const selectedInvestmentPerformanceQuery = useInvestmentPerformance(
    selectedInvestmentId,
    investmentDetailEnabled && drawerMode === "view",
  );
  const selectedInvestmentEventsQuery = useInvestmentEventsByInvestment(
    selectedInvestmentId,
    investmentDetailEnabled,
  );
  const selectedInvestmentSnapshotsQuery = useInvestmentSnapshotsByInvestment(
    selectedInvestmentId,
    investmentDetailEnabled && drawerMode === "view",
  );
  const selectedInvestmentBase =
    selectedInvestmentQuery.data ?? selectedInvestmentSummary;
  const selectedInvestment = useMemo<InvestmentDrawerData | null>(() => {
    if (!selectedInvestmentBase) {
      return null;
    }

    return {
      ...selectedInvestmentBase,
      investmentEvents:
        selectedInvestmentEventsQuery.data ??
        selectedInvestmentBase.investmentEvents ??
        [],
      valuationSnapshots:
        selectedInvestmentSnapshotsQuery.data ??
        selectedInvestmentBase.valuationSnapshots ??
        [],
      performanceHistory:
        selectedInvestmentPerformanceQuery.data?.performanceHistory ??
        selectedInvestmentBase.performanceHistory ??
        [],
      performanceHistorySource:
        selectedInvestmentPerformanceQuery.data?.performanceHistorySource ??
        selectedInvestmentBase.performanceHistorySource ??
        'none',
    };
  }, [
    selectedInvestmentBase,
    selectedInvestmentEventsQuery.data,
    selectedInvestmentPerformanceQuery.data,
    selectedInvestmentSnapshotsQuery.data,
  ]);

  const openCreateDrawer = () => {
    if (accounts.length === 0) {
      pushNotification({
        type: "warning",
        message: "Please add a financial account before adding an investment.",
      });
      return;
    }

    setDrawerMode("create");
    setSelectedInvestmentId(null);
    setDrawerOpen(true);
  };

  const openAssetTaxonomyDrawer = () => {
    setTaxonomyFormError("");
    setAssetTaxonomyDrawerOpen(true);
  };

  useHeaderAction("investments", {
    label: "Investment",
    onClick: openCreateDrawer,
    disabled: loading || accounts.length === 0,
  });

  const hasInvestmentFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    treatmentFilter !== "all" ||
    Boolean(focusedAssetIds);
  const assetTypeLabelMap = useMemo(() => {
    const map = {};
    (Array.isArray(assetTypeConfigs) ? assetTypeConfigs : []).forEach((config) => {
      map[String(config.code)] = config.label;
    });
    return map;
  }, [assetTypeConfigs]);
  const assetCategoryLabelMap = useMemo(() => {
    const map = {};
    (Array.isArray(assetTypeConfigs) ? assetTypeConfigs : []).forEach((config) => {
      (config.categories || []).forEach((cat) => {
        map[String(cat.code)] = cat.label;
      });
    });
    return map;
  }, [assetTypeConfigs]);
  const assetTypeOptions = useMemo(
    () => [
      { value: "all", label: "All Asset Types" },
      ...(Array.isArray(assetTypeConfigs) ? assetTypeConfigs : []).map((config) => ({
        value: String(config.code),
        label: config.label,
      })),
    ],
    [assetTypeConfigs],
  );
  const dashboardWidgets = dashboardAnalyticsQuery.data?.widgets;
  const dashboardInvestments = (dashboardWidgets?.assets ?? []).map((investment) => ({
    ...normalizeInvestmentForUi(investment, taxonomyNodes),
    benefits: (investmentBenefitsData ?? []).filter((benefit) => String(benefit.investmentId) === String(investment.id)),
  }));
  const isFirstInvestmentSetup =
    investmentPagination.total === 0 && !hasInvestmentFilters;
  const portfolioPoints = (dashboardWidgets?.portfolioGrowth.order ?? []).map(
    (key) => dashboardWidgets?.portfolioGrowth.byKey[key],
  ).filter(Boolean);
  const deploymentPoints = (dashboardWidgets?.capitalDeployment.order ?? []).map(
    (key) => dashboardWidgets?.capitalDeployment.byKey[key],
  ).filter(Boolean);
  const categoryPerformanceRows = (dashboardWidgets?.assetTypePerformance.rows ?? []).map((row) => ({
    ...row,
    label: assetTypeLabelMap[row.key] || row.label || row.key,
  }));
  const categoryPerformanceSubRows = (dashboardWidgets?.allocationMix.rows ?? []).map((row) => ({
    ...row,
    label: assetCategoryLabelMap[row.key] || row.label || row.key,
  }));
  const holdingRows = getInvestmentHoldingPerformanceRows(dashboardInvestments, null);
  const categoryBreakdown = categoryPerformanceRows.map((row) => ({ key: row.key, label: row.label, value: row.invested, investmentIds: row.investmentIds, assetType: row.assetType }));
  const categorySubBreakdown = categoryPerformanceSubRows.map((row) => ({ key: row.key, label: row.label, value: row.invested, investmentIds: row.investmentIds, assetType: row.assetType, assetCategory: row.assetCategory ?? row.key }));
  const holdingContributionRows = holdingRows.map((row) => ({ key: row.key, label: row.label, value: row.invested, investmentIds: row.investmentIds, assetType: row.assetType, assetCategory: row.assetCategory }));
  const currentValueBreakdown = categoryPerformanceRows.map((row) => ({ key: row.key, label: row.label, value: row.currentValue, investmentIds: row.investmentIds, assetType: row.assetType }));
  const currentValueSubBreakdown = categoryPerformanceSubRows.map((row) => ({ key: row.key, label: row.label, value: row.currentValue, investmentIds: row.investmentIds, assetType: row.assetType, assetCategory: row.assetCategory ?? row.key }));
  const holdingCurrentValueRows = holdingRows.map((row) => ({ key: row.key, label: row.label, value: row.currentValue, investmentIds: row.investmentIds, assetType: row.assetType, assetCategory: row.assetCategory }));
  const selectedDeploymentPoints = selectedYearForDrill
    ? dashboardWidgets?.capitalDeployment.monthlyByYear?.[selectedYearForDrill] ?? []
    : deploymentPoints;
  const timeSeriesData = selectedDeploymentPoints.map((point) => ({
        label: point.period.label,
        invested: point.state.cumulativeInvested,
        return: point.state.returnAmount ?? 0,
        investedBreakdown: point.breakdown?.invested ?? {},
        returnBreakdown: point.breakdown?.returns ?? {},
      }));
  const portfolioGrowthData = portfolioPoints.map((point) => ({
    label: point.period.label,
    investedToDate: point.state.cumulativeInvested,
    currentValueToDate: point.state.portfolioValue,
    returnToDate: point.state.returnAmount ?? 0,
    snapshotBackedValue: point.valueSources?.snapshot ?? 0,
    estimatedValue: point.valueSources?.derived ?? 0,
    investedOnlyValue: point.valueSources?.invested ?? 0,
  }));
  const dashboardKpiWidgets = dashboardWidgets?.kpis;
  const dashboardKpis = {
    totalInvestments: dashboardInvestments.length,
    totalContributions: Number(dashboardKpiWidgets?.totalContributions.value ?? 0),
    totalInvested: Number(dashboardKpiWidgets?.totalContributions.investments ?? 0),
    totalCurrentValue: Number(dashboardKpiWidgets?.currentPortfolioValue.investments ?? 0),
    totalCurrentValueFromInsuranceSavings: Number(dashboardKpiWidgets?.currentPortfolioValue.insuranceSavings ?? 0),
    totalReturn: Number(dashboardKpiWidgets?.currentPortfolioValue.returnAmount ?? 0),
    returnPercentage: Number(dashboardKpiWidgets?.currentPortfolioValue.returnPercentage ?? 0),
    upcomingMaturity: Number(dashboardKpiWidgets?.upcomingMaturity.investments ?? 0),
    upcomingMaturityFromInsuranceSavings: Number(dashboardKpiWidgets?.upcomingMaturity.insuranceSavings ?? 0),
    insuranceCover: Number(dashboardKpiWidgets?.insuranceCover.value ?? 0),
    insuranceCoverProtection: Number(dashboardKpiWidgets?.insuranceCover.protection ?? 0),
    insuranceCoverSavings: Number(dashboardKpiWidgets?.insuranceCover.savingsLinked ?? 0),
    insuranceSavingsContribution: Number(dashboardKpiWidgets?.totalContributions.insuranceSavings ?? 0),
    protectionExpenseTotal: Number(dashboardKpiWidgets?.insurancePremiumsPaid.protection ?? 0),
  };

  const valueSourceSummary = dashboardWidgets?.sourceOfValue ?? {
    snapshotBackedValue: 0,
    estimatedValue: 0,
    investedOnlyValue: 0,
    snapshotBackedCount: 0,
    estimatedCount: 0,
    investedOnlyCount: 0,
    staleValuationCount: 0,
    staleValuationValue: 0,
    snapshotBackedIds: [],
    estimatedIds: [],
    investedOnlyIds: [],
    staleValuationIds: [],
  };

  const topCurrentValueItems = (dashboardWidgets?.topHoldings ?? []).map((item) =>
    normalizeInvestmentForUi(item, taxonomyNodes),
  );

  const recentInvestments = (dashboardWidgets?.recentlyAdded ?? []).map((item) =>
    normalizeInvestmentForUi(item, taxonomyNodes),
  );

  const upcomingContributions = getInvestmentContributionViewItems(
    (dashboardWidgets?.upcomingContributions ?? []).map((item) =>
      normalizeInvestmentForUi(item, taxonomyNodes),
    ),
  );

  const openEditDrawer = (investment) => {
    if (String(investment?.status || "").toLowerCase() === "closed") return;
    setDrawerMode("edit");
    setSelectedInvestmentId(investment.id);
    setDrawerOpen(true);
  };

  const openViewDrawer = (investment) => {
    setDrawerMode("view");
    setSelectedInvestmentId(investment.id);
    setDrawerOpen(true);
  };

  const openRecordInvestmentActivity = (investment, contributionPlan = null, mode = "contribution") => {
    if (String(investment?.status || "").toLowerCase() === "closed") return;
    setSelectedInvestmentActivity({ investment, contributionPlan, editingEvent: null });
    setRecordActivityMode(mode);
    setRecordActivityModalOpen(true);
  };

  const openEditInvestmentActivity = (investment, item, activityType = "income_credit") => {
    if (String(investment?.status || "").toLowerCase() === "closed") return;
    setSelectedInvestmentActivity({
      investment,
      contributionPlan: null,
      editingEvent: activityType === "benefit" ? null : item,
      editingBenefit: activityType === "benefit" ? item : null,
    });
    setRecordActivityMode(activityType === "benefit" ? "benefit" : "income_credit");
    setRecordActivityModalOpen(true);
  };

  const closeRecordInvestmentActivity = () => {
    setRecordActivityModalOpen(false);
    setSelectedInvestmentActivity(null);
  };

  const openRecordContributionModal = (investment, contributionPlan) => {
    openRecordInvestmentActivity(investment, contributionPlan, "contribution");
  };

  const closeInvestmentDrawer = () => {
    setDrawerOpen(false);
    setSelectedInvestmentId(null);
    setDrawerMode("create");
  };

  const closeAssetTaxonomyDrawer = () => {
    setTaxonomyFormError("");
    setAssetTaxonomyDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setTreatmentFilter("all");
    setInvestmentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setInvestmentPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setInvestmentPage(1);
  };

  const handleCategoryFilterChange = (value) => {
    setCategoryFilter(value);
    setInvestmentPage(1);
  };

  const handleTreatmentFilterChange = (value) => {
    setTreatmentFilter(value);
    setInvestmentPage(1);
  };

  const handleFocusedAssetIdsChange = (ids) => {
    setFocusedAssetIds(ids);
    setInvestmentPage(1);
  };

  const handleSortModelChange = (model) => {
    setSortModel(model);
    setInvestmentPage(1);
  };

  const handlePageChange = (page, pageSize) => {
    setInvestmentPage(page);
    setInvestmentPageSize(pageSize);
  };

  const handleDeleteInvestment = () => {
    if (!deleteTarget) return;

    const removeInvestment = async () => {
      try {
        await removeInvestmentMutation.mutateAsync(deleteTarget.id);
        setDeleteTarget(null);
        setUiError("");
        pushNotification({ type: "success", message: "Investment removed" });
      } catch (error) {
        void error;
        setUiError("Failed to remove investment");
        pushNotification({
          type: "error",
          message: "Failed to remove investment",
        });
      }
    };

    void removeInvestment();
  };

  const handleSaveAssetTaxonomy = (formValues) => {
    const persistAssetTaxonomy = async () => {
      setTaxonomyFormError("");
      try {
        const savedNode = await saveTaxonomyMutation.mutateAsync(formValues);
        pushNotification({
          type: "success",
          message: formValues.id
            ? "Asset taxonomy updated"
            : "Asset taxonomy saved",
        });
        setTaxonomyFormError("");
        return savedNode;
      } catch (error) {
        setTaxonomyFormError(
          getRuntimeErrorMessage(
            error,
            formValues.id
              ? "Failed to update asset taxonomy"
              : "Failed to save asset taxonomy",
          ),
        );
        return null;
      }
    };

    return persistAssetTaxonomy();
  };

  const handleDeleteAssetTaxonomy = (targetNode) => {
    const removeAssetTaxonomy = async () => {
      try {
        await removeTaxonomyMutation.mutateAsync(targetNode.id);
        pushNotification({
          type: "success",
          message: "Asset taxonomy removed",
        });
      } catch (error) {
        void error;
        pushNotification({
          type: "error",
          message: "Failed to remove asset taxonomy",
        });
      }
    };

    void removeAssetTaxonomy();
  };

  const columns = useMemo(
    () =>
      getInvestmentsTableColumns({
        onView: openViewDrawer,
        onEdit: openEditDrawer,
        onDelete: (investment) => setDeleteTarget(investment),
        assetTypeConfigs,
      }),
    [assetTypeConfigs],
  );

  const renderDashboardView = () => (
    <InvestmentsDashboardView
      investments={summaryInvestments}
      portfolioInvestments={dashboardInvestments}
      analyticsLoading={dashboardAnalyticsQuery.isPending}
      analyticsError={dashboardAnalyticsQuery.error ? getRuntimeErrorMessage(dashboardAnalyticsQuery.error, 'Failed to load portfolio analytics') : ''}
      benefitsLoading={investmentBenefitsQuery.isPending}
      benefitsError={Boolean(investmentBenefitsQuery.error)}
      portfolioGrowthData={portfolioGrowthData}
      timeSeriesData={timeSeriesData}
      isDrillMode={Boolean(selectedYearForDrill)}
      onDrillYear={setSelectedYearForDrill}
      onResetDrill={() => setSelectedYearForDrill(null)}
      dashboardKpis={dashboardKpis}
      categoryBreakdown={categoryBreakdown}
      categoryLabelMap={assetTypeLabelMap}
      valueSourceSummary={valueSourceSummary}
      categoryPerformanceRows={categoryPerformanceRows}
      categorySubBreakdown={categorySubBreakdown}
      categoryPerformanceSubRows={categoryPerformanceSubRows}
      holdingRows={holdingRows}
      currentValueBreakdown={currentValueBreakdown}
      currentValueSubBreakdown={currentValueSubBreakdown}
      holdingCurrentValueRows={holdingCurrentValueRows}
      holdingContributionRows={holdingContributionRows}
      topCurrentValueItems={topCurrentValueItems}
      upcomingContributions={upcomingContributions}
      recentInvestments={recentInvestments}
      taxonomyNodes={taxonomyNodes}
      columns={columns}
      search={search}
      onSearchChange={handleSearchChange}
      statusFilter={statusFilter}
      onStatusFilterChange={handleStatusFilterChange}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={handleCategoryFilterChange}
      treatmentFilter={treatmentFilter}
      onTreatmentFilterChange={handleTreatmentFilterChange}
      categoryOptions={assetTypeOptions}
      onResetFilters={handleResetFilters}
      onCreateInvestment={openCreateDrawer}
      onRecordContribution={openRecordContributionModal}
      formatCurrency={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: dashboardAnalyticsQuery.data?.responseContext.currency ?? 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0)}
        pagination={investmentPagination}
        onPageChange={handlePageChange}
        focusedAssetIds={focusedAssetIds}
        onFocusedAssetIdsChange={handleFocusedAssetIdsChange}
        sortModel={sortModel}
        onSortModelChange={handleSortModelChange}
    />
  );

  return (
    <Box sx={{ pb: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Investments
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 760 }}
          >
            Organize mutual funds, deposits, retirement accounts, insurance
            policies, metals, and other long-term assets in one operational
            workspace.
          </Typography>
        </Box>

        {!loading ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <AppButton variant="outlined" onClick={openAssetTaxonomyDrawer}>
              Manage Taxonomy
            </AppButton>
          </Box>
        ) : null}
      </Box>

      {error ? (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <Typography color="text.secondary">Loading investments...</Typography>
      ) : null}
      {!loading && isFirstInvestmentSetup ? (
        <Box
          sx={{
            minHeight: {
              xs: "calc(100dvh - 240px)",
              md: "calc(100dvh - 220px)",
            },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            backgroundColor: "background.paper",
            px: 2,
            py: 3,
          }}
        >
          <EmptyState
            title="No investments added yet"
            description="Add your first investment to unlock portfolio insights, allocation mix, and scheduled contribution tracking."
            actionLabel="Add Investment"
            onAction={openCreateDrawer}
          />
        </Box>
      ) : null}
      {!loading && !isFirstInvestmentSetup ? renderDashboardView() : null}

      {drawerOpen && selectedInvestmentId != null && (!selectedInvestmentQuery.data || (drawerMode === 'edit' && (selectedInvestmentEventsQuery.isLoading || selectedInvestmentEventsQuery.error))) ? (
        <AppDrawer open onClose={closeInvestmentDrawer} title="Investment">
          {selectedInvestmentQuery.error || selectedInvestmentEventsQuery.error || (!selectedInvestmentQuery.isPending && !selectedInvestmentQuery.data)
            ? <Alert severity="error" action={<AppButton size="small" onClick={() => { selectedInvestmentQuery.refetch(); selectedInvestmentEventsQuery.refetch(); }}>Retry</AppButton>}>Failed to load the investment draft.</Alert>
            : <Typography color="text.secondary">Loading investment...</Typography>}
        </AppDrawer>
      ) : null}

      {drawerOpen && drawerMode !== "view" &&
        (drawerMode === "create" || (Boolean(selectedInvestmentQuery.data) && !selectedInvestmentEventsQuery.isLoading && !selectedInvestmentEventsQuery.error)) ? (
        <InvestmentSaveDrawer
          onClose={closeInvestmentDrawer}
          onSaved={() => setUiError("")}
          initialValues={drawerMode === "edit" ? selectedInvestment : null}
        />
      ) : null}

      <InvestmentViewDrawer
        open={
          drawerOpen &&
          drawerMode === "view" &&
          Boolean(selectedInvestmentQuery.data)
        }
        onClose={closeInvestmentDrawer}
        investment={selectedInvestment}
        accounts={accounts}
        taxonomyNodes={taxonomyNodes}
        onEdit={openEditDrawer}
        onRecordActivity={openRecordInvestmentActivity}
        onEditActivity={openEditInvestmentActivity}
        eventsLoading={selectedInvestmentEventsQuery.isLoading}
        eventsError={selectedInvestmentEventsQuery.error}
        snapshotsLoading={selectedInvestmentSnapshotsQuery.isLoading}
        snapshotsError={selectedInvestmentSnapshotsQuery.error}
        performanceLoading={selectedInvestmentPerformanceQuery.isLoading}
        performanceError={selectedInvestmentPerformanceQuery.error}
        onRetryHistory={() => {
          selectedInvestmentEventsQuery.refetch();
          selectedInvestmentSnapshotsQuery.refetch();
          selectedInvestmentPerformanceQuery.refetch();
        }}
      />

      <InvestmentAssetTaxonomyFormDrawer
        open={assetTaxonomyDrawerOpen}
        onClose={closeAssetTaxonomyDrawer}
        onSubmit={handleSaveAssetTaxonomy}
        onDelete={handleDeleteAssetTaxonomy}
        assetTypeConfigs={assetTypeConfigs}
        taxonomyNodes={taxonomyNodes}
        submitError={taxonomyFormError}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete investment"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.name} from the organizer? This only affects the current MVP dataset.`
            : ""
        }
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteInvestment}
      />

      <RecordInvestmentActivityModal
        open={recordActivityModalOpen}
        onClose={closeRecordInvestmentActivity}
        investment={selectedInvestmentActivity?.investment}
        contributionPlan={selectedInvestmentActivity?.contributionPlan}
        accounts={accounts}
        initialMode={recordActivityMode}
        editingEvent={selectedInvestmentActivity?.editingEvent}
        editingBenefit={selectedInvestmentActivity?.editingBenefit}
      />

    </Box>
  );
}
