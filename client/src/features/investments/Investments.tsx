// @ts-nocheck
import React, { useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import InvestmentAssetTaxonomyFormDrawer from "./components/InvestmentAssetTaxonomyFormDrawer";
import InvestmentFormDrawer from "./components/InvestmentFormDrawer";
import RecurringOccurrencesReviewDialog from "./components/RecurringOccurrencesReviewDialog";
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
  buildInvestmentFromForm,
  formatInvestmentCurrency,
  normalizeInvestmentForUi,
} from "../../utils/investmentHelpers";
import { getRuntimeErrorMessage } from "../../utils/errorMessage";
import { frequencyToCadence } from "../../utils/investmentHelpers";
import {
  useInvestmentDashboardAnalytics,
  useInvestment,
  useInvestmentEventsByInvestment,
  useInvestmentPerformance,
  useInvestmentReferenceData,
  useInvestmentSnapshotsByInvestment,
  useInvestmentSummaryPageData,
  useRemoveInvestment,
  useSaveInvestment,
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
  getInvestmentTimeSeriesData,
} from "./investments.selectors";
import type { InvestmentDrawerData } from "./types/investment.types";
import {
  useConfirmRecurringInvestmentContributionPlan,
  useUpdateInvestmentContributionPlan,
} from "./hooks/useContributionPlans";
import { useInvestmentBenefits } from "./hooks/useInvestmentBenefits";

export const mapFrequencyToCadence = frequencyToCadence;

export const toDateOnly = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return null;
  return parsed.format("YYYY-MM-DD");
};

export const buildRecurringPayloadFromFormValues = (baseValues) => {
  const plan = baseValues?.recurringPlan || {};
  const cadence = mapFrequencyToCadence(plan.frequency);

  return {
    amount: Number(plan.amount || 0),
    cadenceUnit: cadence.cadenceUnit,
    cadenceInterval: cadence.cadenceInterval,
    anchorDate: toDateOnly(plan.anchorDate || baseValues.startDate),
    endDate: toDateOnly(plan.endDate) || undefined,
    historicalImportMode: plan.historicalImportMode || "TRACK_FROM_TODAY",
    autoCreateEvent: false,
    openingPrincipalAmount:
      plan.openingPrincipalAmount !== "" &&
      plan.openingPrincipalAmount !== undefined
        ? Number(plan.openingPrincipalAmount)
        : undefined,
    openingIncomeAmount:
      plan.openingIncomeAmount !== "" && plan.openingIncomeAmount !== undefined
        ? Number(plan.openingIncomeAmount)
        : undefined,
  };
};

export const buildRecurringPlanUpdatePayloadFromFormValues = (
  formValues,
  existingPlan,
) => {
  const recurringPayload = buildRecurringPayloadFromFormValues(formValues);
  return {
    amount: recurringPayload.amount,
    cadenceUnit: recurringPayload.cadenceUnit,
    cadenceInterval: recurringPayload.cadenceInterval,
    anchorDate: recurringPayload.anchorDate,
    endDate: recurringPayload.endDate,
    historicalImportMode: recurringPayload.historicalImportMode,
    status: existingPlan?.status || undefined,
  };
};

export const buildRecurringReviewState = ({
  formValues,
  nextInvestment,
  drawerMode,
  selectedInvestmentId,
  selectedInvestment,
}) => {
  const recurringPayload = buildRecurringPayloadFromFormValues(formValues);
  const existingPlan = selectedInvestment?.activeContributionPlan;
  const alreadyHasActivePlan = drawerMode === "edit" && Boolean(existingPlan);
  const reviewedHistoricalItems = [];

  if (
    recurringPayload.historicalImportMode === "OPENING_BALANCE" &&
    !alreadyHasActivePlan
  ) {
    const openingDate = toDateOnly(formValues?.startDate) || toDateOnly(dayjs());
    const openingItems = [
      ["openingPrincipalAmount", "OPENING_BALANCE", "Opening principal import"],
      ["openingIncomeAmount", "OPENING_INCOME_CREDIT", "Opening historical income import"],
    ];

    openingItems.forEach(([amountKey, eventType, notes]) => {
      const amount = Number(formValues?.recurringPlan?.[amountKey] || 0);
      if (amount > 0) {
        reviewedHistoricalItems.push({
          dueDate: openingDate,
          eventDate: openingDate,
          amount,
          selected: true,
          status: "CONFIRMED",
          eventType,
          notes,
        });
      }
    });
  }

  return {
    formValues,
    investmentPayload: nextInvestment,
    recurringPayload,
    reviewedHistoricalItems,
    historicalImportMode: recurringPayload.historicalImportMode,
    drawerMode,
    selectedInvestmentId,
    alreadyHasActivePlan,
    activePlanId: existingPlan?.id || null,
    investmentName: nextInvestment?.name || selectedInvestment?.name || "",
    reviewSummary: {
      investment: [
        { label: "Name", value: nextInvestment?.name || "-" },
        { label: "Status", value: nextInvestment?.status || "-" },
      ],
      valuation: [
        { label: "Current value", value: formatInvestmentCurrency(nextInvestment?.currentValue) },
      ],
      recurring: [
        { label: "Contribution", value: formatInvestmentCurrency(recurringPayload.amount) },
        { label: "Anchor date", value: recurringPayload.anchorDate || "-" },
        { label: "Import mode", value: recurringPayload.historicalImportMode },
      ],
    },
  };
};

export const buildRecurringConfirmPayload = (
  recurringPayload,
  reviewedHistoricalItems,
) => ({
  ...recurringPayload,
  reviewedHistoricalItems: Array.isArray(reviewedHistoricalItems)
    ? reviewedHistoricalItems
    : [],
});

export default function Investments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [treatmentFilter, setTreatmentFilter] = useState("all");
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
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [recurringConfirmLoading, setRecurringConfirmLoading] = useState(false);
  const [pendingRecurringReview, setPendingRecurringReview] = useState(null);
  const [selectedInvestmentActivity, setSelectedInvestmentActivity] = useState(null);
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );
  const saveInvestmentMutation = useSaveInvestment();
  const removeInvestmentMutation = useRemoveInvestment();
  const updateContributionPlanMutation = useUpdateInvestmentContributionPlan();
  const confirmContributionPlanMutation =
    useConfirmRecurringInvestmentContributionPlan();
  const saveTaxonomyMutation = useSaveInvestmentAssetTaxonomy();
  const removeTaxonomyMutation = useRemoveInvestmentAssetTaxonomy();
  const {
    investments: rawInvestments,
    loading: investmentsLoading,
    error: pageDataError,
  } = useInvestmentSummaryPageData();
  const {
    taxonomyNodes,
    accounts,
    assetTypeConfigs,
    loading: referenceDataLoading,
    error: referenceDataError,
    reload: reloadReferenceData,
  } = useInvestmentReferenceData();
  const dashboardEnabled = true;
  const dashboardAnalyticsQuery = useInvestmentDashboardAnalytics(dashboardEnabled);
  const investmentBenefitsQuery = useInvestmentBenefits();
  const investmentBenefitsData = investmentBenefitsQuery.data;
  const loading =
    investmentsLoading ||
    referenceDataLoading ||
    investmentBenefitsQuery.isLoading ||
    (dashboardEnabled && dashboardAnalyticsQuery.isLoading);
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
    treatmentFilter !== "all";
  const isFirstInvestmentSetup =
    summaryInvestments.length === 0 && !hasInvestmentFilters;


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
  const holdingRows = getInvestmentHoldingPerformanceRows(summaryInvestments, 12);
  const categoryBreakdown = categoryPerformanceRows.map((row) => ({ key: row.key, label: row.label, value: row.invested, investmentIds: row.investmentIds, assetType: row.assetType }));
  const categorySubBreakdown = categoryPerformanceSubRows.map((row) => ({ key: row.key, label: row.label, value: row.invested, investmentIds: row.investmentIds, assetCategory: row.key }));
  const holdingContributionRows = categoryPerformanceRows.map((row) => ({ key: row.key, label: row.label, value: row.invested, investmentIds: row.investmentIds }));
  const currentValueBreakdown = categoryPerformanceRows.map((row) => ({ key: row.key, label: row.label, value: row.currentValue, investmentIds: row.investmentIds, assetType: row.assetType }));
  const currentValueSubBreakdown = categoryPerformanceSubRows.map((row) => ({ key: row.key, label: row.label, value: row.currentValue, investmentIds: row.investmentIds, assetCategory: row.key }));
  const holdingCurrentValueRows = categoryPerformanceRows.map((row) => ({ key: row.key, label: row.label, value: row.currentValue, investmentIds: row.investmentIds }));
  const breakdownPoints = getInvestmentTimeSeriesData(
    summaryInvestments,
    selectedYearForDrill,
  );
  const breakdownByLabel = Object.fromEntries(
    breakdownPoints.map((point) => [point.label, point]),
  );
  const fallbackInvestedBreakdown = Object.fromEntries(
    categoryPerformanceRows.map((row) => [row.key, row.invested]),
  );
  const fallbackReturnBreakdown = Object.fromEntries(
    categoryPerformanceRows.map((row) => [row.key, row.returnAmount]),
  );
  const timeSeriesData = selectedYearForDrill
    ? breakdownPoints
    : deploymentPoints.map((point) => ({
        label: point.period.label,
        invested: point.state.cumulativeInvested,
        return: point.state.returnAmount ?? 0,
        investedBreakdown: breakdownByLabel[point.period.label]?.investedBreakdown ?? fallbackInvestedBreakdown,
        returnBreakdown: breakdownByLabel[point.period.label]?.returnBreakdown ?? fallbackReturnBreakdown,
      }));
  const portfolioGrowthData = portfolioPoints.map((point) => ({
    label: point.period.label,
    investedToDate: point.state.cumulativeInvested,
    currentValueToDate: point.state.portfolioValue,
    returnToDate: point.state.returnAmount ?? 0,
    snapshotBackedValue: point.state.portfolioValue ?? 0,
    estimatedValue: 0,
    investedOnlyValue: 0,
  }));
  const dashboardKpiWidgets = dashboardWidgets?.kpis;
  const dashboardKpis = {
    totalInvestments: summaryInvestments.length,
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
    setSelectedInvestmentActivity({ investment, contributionPlan, editingEvent: null });
    setRecordActivityMode(mode);
    setRecordActivityModalOpen(true);
  };

  const openEditInvestmentActivity = (investment, item, activityType = "income_credit") => {
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
    setStatusFilter("all");
    setCategoryFilter("all");
    setTreatmentFilter("all");
  };

  const handleSaveInvestment = async (formValues) => {
    const nextInvestment = buildInvestmentFromForm(
      formValues,
      drawerMode === "edit" ? selectedInvestmentId : null,
      taxonomyNodes,
    );

    try {
      const wantsRecurringPlan = formValues?.contributionType === "recurring";
      const alreadyHasActivePlan =
        drawerMode === "edit" &&
        Boolean(selectedInvestment?.activeContributionPlan);

      if (wantsRecurringPlan) {
        setPendingRecurringReview(
          buildRecurringReviewState({
            formValues,
            nextInvestment,
            drawerMode,
            selectedInvestmentId,
            selectedInvestment,
            accounts,
          }),
        );

        setReviewDialogOpen(true);
        return null;
      }

      await saveInvestmentMutation.mutateAsync({
        payload: nextInvestment,
        selectedInvestmentId:
          drawerMode === "edit" ? selectedInvestmentId : null,
      });

      pushNotification({
        type: "success",
        message: wantsRecurringPlan
          ? drawerMode === "edit"
            ? alreadyHasActivePlan
              ? "Investment updated. Existing recurring plan kept as-is"
              : "Investment updated with recurring plan"
            : "Investment added with recurring plan"
          : drawerMode === "edit"
            ? "Investment updated"
            : "Investment added",
      });

      setUiError("");
      closeInvestmentDrawer();
      return null;
    } catch (error) {
      setUiError(
        drawerMode === "edit"
          ? "Failed to update investment"
          : "Failed to add investment",
      );
      return getRuntimeErrorMessage(
        error,
        drawerMode === "edit"
          ? "Failed to update investment"
          : "Failed to add investment",
      );
    }
  };

  const handleCancelRecurringReview = async () => {
    setReviewDialogOpen(false);
    setPendingRecurringReview(null);
    pushNotification({
      type: "info",
      message:
        "Returned to the investment form. Update the draft and confirm again when ready.",
    });
  };

  const handleConfirmRecurringReview = async () => {
    if (!pendingRecurringReview) return;

    setRecurringConfirmLoading(true);
    let createdInvestmentId = null;

    try {
      const savedInvestment = await saveInvestmentMutation.mutateAsync({
        payload: pendingRecurringReview.investmentPayload,
        selectedInvestmentId: pendingRecurringReview.selectedInvestmentId,
      });

      const targetInvestmentId =
        pendingRecurringReview.drawerMode === "edit"
          ? pendingRecurringReview.selectedInvestmentId
          : savedInvestment?.id ||
            savedInvestment?.investment?.id ||
            savedInvestment?.data?.id;

      if (!targetInvestmentId) {
        throw new Error(
          "Investment ID was not available in the save response.",
        );
      }

      if (pendingRecurringReview.drawerMode === "create") {
        createdInvestmentId = targetInvestmentId;
      }

      if (pendingRecurringReview.alreadyHasActivePlan) {
        const planId = pendingRecurringReview.activePlanId;

        if (!planId) {
          throw new Error("Recurring plan ID was not available in the save response.");
        }

        await updateContributionPlanMutation.mutateAsync({
          investmentId: targetInvestmentId,
          planId,
          payload: buildRecurringPlanUpdatePayloadFromFormValues(
            pendingRecurringReview.formValues,
            selectedInvestment?.activeContributionPlan,
          ),
        });
      } else {
        await confirmContributionPlanMutation.mutateAsync({
          investmentId: targetInvestmentId,
          payload: buildRecurringConfirmPayload(
            pendingRecurringReview.recurringPayload,
            pendingRecurringReview.reviewedHistoricalItems,
          ),
        });
      }

      setReviewDialogOpen(false);
      setPendingRecurringReview(null);
      setUiError("");
      closeInvestmentDrawer();
      pushNotification({
        type: "success",
        message:
          pendingRecurringReview.drawerMode === "edit"
            ? "Investment updated and recurring plan confirmed"
            : "Investment and recurring plan created",
      });
    } catch (error) {
      if (createdInvestmentId) {
        try {
          await removeInvestmentMutation.mutateAsync(createdInvestmentId);
        } catch (cleanupError) {
          void cleanupError;
        }
      }

      pushNotification({
        type: "error",
        message: getRuntimeErrorMessage(
          error,
          pendingRecurringReview.drawerMode === "edit"
            ? "Failed to save recurring plan confirmation"
            : "Failed to create investment and recurring plan",
        ),
      });
    } finally {
      setRecurringConfirmLoading(false);
    }
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
        await reloadReferenceData();
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
        await reloadReferenceData();
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
      onSearchChange={setSearch}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={setCategoryFilter}
      treatmentFilter={treatmentFilter}
      onTreatmentFilterChange={setTreatmentFilter}
      categoryOptions={assetTypeOptions}
      onResetFilters={handleResetFilters}
      onCreateInvestment={openCreateDrawer}
      onRecordContribution={openRecordContributionModal}
      formatCurrency={formatInvestmentCurrency}
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

      <InvestmentFormDrawer
        open={
          drawerOpen &&
          drawerMode !== "view" &&
          (drawerMode === "create" || Boolean(selectedInvestmentQuery.data))
        }
        onClose={closeInvestmentDrawer}
        onSubmit={handleSaveInvestment}
        initialValues={drawerMode === "edit" ? selectedInvestment : null}
        accounts={accounts}
        assetTypeConfigs={assetTypeConfigs}
        taxonomyNodes={taxonomyNodes}
        title={drawerMode === "edit" ? "Edit Investment" : "Add Investment"}
        submitLabel={drawerMode === "edit" ? "Update" : "Add"}
      />

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

      <RecurringOccurrencesReviewDialog
        open={reviewDialogOpen}
        loading={recurringConfirmLoading}
        items={pendingRecurringReview?.reviewedHistoricalItems || []}
        historicalImportMode={pendingRecurringReview?.historicalImportMode}
        investmentName={pendingRecurringReview?.investmentName}
        reviewSummary={pendingRecurringReview?.reviewSummary}
        dialogTitle={
          pendingRecurringReview?.drawerMode === "edit"
            ? "Review Investment Update"
            : "Review Investment Setup"
        }
        onCancel={handleCancelRecurringReview}
        onConfirm={handleConfirmRecurringReview}
        confirmLabel={
          pendingRecurringReview?.drawerMode === "edit"
            ? "Confirm Changes"
            : "Confirm and Create"
        }
      />
    </Box>
  );
}
