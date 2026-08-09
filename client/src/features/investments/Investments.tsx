// @ts-nocheck
import React, { useMemo, useState } from "react";
import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiEyeOutline, mdiPencilOutline } from "@mdi/js";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import dayjs from "dayjs";
import { INVESTMENT_EVENT_TYPES, OPENING_INVESTMENT_EVENT_TYPES } from "../../types/investmentEventTypes";
import InvestmentAssetTaxonomyFormDrawer from "./components/InvestmentAssetTaxonomyFormDrawer";
import InvestmentFormDrawer from "./components/InvestmentFormDrawer";
import RecurringOccurrencesReviewDialog from "./components/RecurringOccurrencesReviewDialog";
import AppButton from "../../components/common/AppButton";
import { EmptyState, StatusChip } from "../../components/common";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";
import { InvestmentViewDrawer } from "./components/InvestmentViewDrawer";
import InvestmentsCalendarView from "./components/InvestmentsCalendarView";
import InvestmentsDashboardView from "./components/InvestmentsDashboardView";
import RecordContributionModal from "./components/RecordContributionModal";
import { useHeaderAction } from "../../hooks/useHeaderAction";
import { useNotificationStore } from "../../store/notificationStore";
import {
  buildInvestmentFromForm,
  formatInvestmentCurrency,
  formatInvestmentDate,
  getInvestmentCategoryLabel,
  getInvestmentCategoryOptions,
  getInvestmentStatusTone,
} from "../../utils/investmentHelpers";
import { getRuntimeErrorMessage } from "../../utils/errorMessage";
import {
  useInvestmentDashboardAnalytics,
  useInvestment,
  useInvestmentEventsData,
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
  getInvestmentCalendarGroups,
  getInvestmentCategoryBreakdown,
  getInvestmentCategoryPerformanceRows,
  getInvestmentCategoryLabelMap,
  getInvestmentDashboardKpis,
  getInvestmentPortfolioGrowthData,
  getInvestmentSelectedById,
  getInvestmentTimeSeriesData,
  getInvestmentValueSourceSummary,
  getNormalizedInvestments,
  getRecentInvestments,
  getTopInvestmentCurrentValueItems,
  getInvestmentContributionViewItems,
} from "./investments.selectors";
import type { InvestmentDrawerData } from "./types/investment.types";
import {
  useConfirmRecurringInvestmentContributionPlan,
  useUpdateInvestmentContributionPlan,
} from "./hooks/useContributionPlans";

const VIEW_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "calendar", label: "Investment Activity" },
];

const getCadenceLabel = (cadenceUnit, cadenceInterval) => {
  const interval = Math.max(Number(cadenceInterval) || 1, 1);

  if (interval === 1) {
    if (cadenceUnit === "week") return "Weekly";
    if (cadenceUnit === "month") return "Monthly";
    if (cadenceUnit === "quarter") return "Quarterly";
    if (cadenceUnit === "year") return "Yearly";
  }

  if (cadenceUnit === "month") {
    return `Every ${interval} months`;
  }

  return `Every ${interval} ${cadenceUnit}${interval === 1 ? "" : "s"}`;
};

const getInvestmentReturnMetrics = (investment) => {
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

export const mapFrequencyToCadence = (frequency) => {
  if (frequency === "weekly")
    return { cadenceUnit: "week", cadenceInterval: 1 };
  if (frequency === "quarterly")
    return { cadenceUnit: "quarter", cadenceInterval: 1 };
  if (frequency === "halfyearly")
    return { cadenceUnit: "month", cadenceInterval: 6 };
  if (frequency === "yearly")
    return { cadenceUnit: "year", cadenceInterval: 1 };
  return { cadenceUnit: "month", cadenceInterval: 1 };
};

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
    sourceAccountId:
      baseValues.accountId !== undefined &&
      baseValues.accountId !== null &&
      baseValues.accountId !== ""
        ? String(baseValues.accountId)
        : undefined,
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
  baseValues,
  existingPlan,
) => {
  const recurringPayload = buildRecurringPayloadFromFormValues(baseValues);

  return {
    sourceAccountId: recurringPayload.sourceAccountId,
    amount: recurringPayload.amount,
    cadenceUnit: recurringPayload.cadenceUnit,
    cadenceInterval: recurringPayload.cadenceInterval,
    anchorDate: recurringPayload.anchorDate,
    nextDueDate: toDateOnly(baseValues?.recurringPlan?.nextContributionDate) || null,
    endDate: recurringPayload.endDate || null,
    historicalImportMode: recurringPayload.historicalImportMode,
    status: existingPlan?.status || "active",
  };
};

export const buildReviewedHistoricalItemsFromFormValues = (baseValues) => {
  const recurringPayload = buildRecurringPayloadFromFormValues(baseValues);
  const today = dayjs().format("YYYY-MM-DD");
  const reviewedHistoricalItems = [];

  if (recurringPayload.historicalImportMode !== "OPENING_BALANCE") {
    return reviewedHistoricalItems;
  }

  if (Number(recurringPayload.openingPrincipalAmount || 0) > 0) {
    reviewedHistoricalItems.push({
      dueDate: today,
      amount: Number(recurringPayload.openingPrincipalAmount || 0),
      selected: true,
      status: "CONFIRMED",
      eventDate: today,
      eventType: INVESTMENT_EVENT_TYPES.OPENING_BALANCE,
      sequenceNumber: 1,
      notes: "Generated via OPENING_BALANCE",
    });
  }

  if (Number(recurringPayload.openingIncomeAmount || 0) > 0) {
    reviewedHistoricalItems.push({
      dueDate: today,
      amount: Number(recurringPayload.openingIncomeAmount || 0),
      selected: true,
      status: "CONFIRMED",
      eventDate: today,
      eventType: INVESTMENT_EVENT_TYPES.OPENING_INCOME_CREDIT,
      sequenceNumber: reviewedHistoricalItems.length + 1,
      notes: "Generated via OPENING_BALANCE",
    });
  }

  return reviewedHistoricalItems;
};

export const buildReviewedHistoricalItemsFromInvestment = (investment) => {
  const activePlanId = investment?.activeContributionPlan?.id;

  return (Array.isArray(investment?.investmentEvents)
    ? investment.investmentEvents
    : []
  )
    .filter((item) => {
      const status = String(item?.status || '').toUpperCase();
      const eventType = item?.eventType;

      if (status !== 'CONFIRMED') return false;
      if (activePlanId != null && String(item?.recurringPlanId ?? '') !== String(activePlanId)) {
        return false;
      }

      return OPENING_INVESTMENT_EVENT_TYPES.includes(eventType);
    })
    .map((item, index) => ({
      dueDate: item.dueDate || item.eventDate,
      amount: Number(item.amount || 0),
      selected: true,
      status: item.status || 'CONFIRMED',
      eventDate: item.eventDate || item.dueDate,
      eventType: item.eventType || INVESTMENT_EVENT_TYPES.CONTRIBUTION,
      sequenceNumber: item.sequenceNumber || index + 1,
      notes: item.notes || '',
    }));
};

const buildRecurringReviewState = ({
  formValues,
  nextInvestment,
  drawerMode,
  selectedInvestmentId,
  selectedInvestment,
  accounts,
}) => {
  const recurringPayload = buildRecurringPayloadFromFormValues(formValues);
  const alreadyHasActivePlan =
    drawerMode === 'edit' && Boolean(selectedInvestment?.activeContributionPlan);

  return {
    investmentPayload: nextInvestment,
    formValues,
    selectedInvestmentId:
      drawerMode === 'edit' ? selectedInvestmentId : null,
    drawerMode,
    recurringPayload,
    alreadyHasActivePlan,
    activePlanId: selectedInvestment?.activeContributionPlan?.id ?? null,
    reviewedHistoricalItems: alreadyHasActivePlan
      ? buildReviewedHistoricalItemsFromInvestment(selectedInvestment)
      : buildReviewedHistoricalItemsFromFormValues(formValues),
    historicalImportMode: recurringPayload.historicalImportMode,
    investmentName: nextInvestment.name,
    reviewSummary: {
      investment: [
        {
          label: 'Investment Name',
          value: formatReviewValue(nextInvestment.name),
        },
        {
          label: 'Investment Type',
          value: formatReviewValue(
            getInvestmentCategoryLabel(nextInvestment.assetCategory),
          ),
        },
        {
          label: 'Asset Class',
          value: formatReviewValue(formValues.type),
        },
        {
          label: 'Funding Account',
          value: formatReviewValue(
            accounts.find(
              (account) => String(account.id) === String(nextInvestment.accountId),
            )?.displayName ||
              accounts.find(
                (account) => String(account.id) === String(nextInvestment.accountId),
              )?.name ||
              accounts.find(
                (account) => String(account.id) === String(nextInvestment.accountId),
              )?.institutionName,
          ),
        },
        {
          label: 'Institution',
          value: formatReviewValue(nextInvestment.institutionName),
        },
        {
          label: 'Start Date',
          value: formatReviewValue(nextInvestment.startDate),
        },
        {
          label: 'Status',
          value: formatReviewValue(nextInvestment.status),
        },
        {
          label: 'Reference',
          value: formatReviewValue(nextInvestment.referenceNumber),
        },
      ],
      valuation: [
        {
          label: 'Total Invested',
          value: 'System calculated',
        },
        {
          label: 'Current Value',
          value: 'System calculated',
        },
        {
          label: 'Maturity Date',
          value: formatReviewValue(nextInvestment.maturityDate),
        },
      ],
      recurring: [
        {
          label: 'Recurring Amount',
          value: formatReviewValue(recurringPayload.amount),
        },
        {
          label: 'Frequency',
          value: formatReviewValue(formValues?.recurringPlan?.frequency),
        },
        {
          label: 'Anchor Date',
          value: formatReviewValue(recurringPayload.anchorDate),
        },
        {
          label: 'Plan End Date',
          value: formatReviewValue(recurringPayload.endDate),
        },
        {
          label: 'Historical Import',
          value: formatReviewValue(recurringPayload.historicalImportMode),
        },
        {
          label: 'Opening Principal',
          value:
            recurringPayload.historicalImportMode === 'OPENING_BALANCE'
              ? formatReviewValue(recurringPayload.openingPrincipalAmount)
              : 'Not applicable',
        },
        {
          label: 'Opening Income',
          value:
            recurringPayload.historicalImportMode === 'OPENING_BALANCE'
              ? formatReviewValue(recurringPayload.openingIncomeAmount)
              : 'Not applicable',
        },
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

const formatReviewValue = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

export default function Investments() {
  const [activeView, setActiveView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uiError, setUiError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assetTaxonomyDrawerOpen, setAssetTaxonomyDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("create");
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedYearForDrill, setSelectedYearForDrill] = useState(null);
  const [taxonomyFormError, setTaxonomyFormError] = useState("");
  const [recordContributionModalOpen, setRecordContributionModalOpen] =
    useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [recurringConfirmLoading, setRecurringConfirmLoading] = useState(false);
  const [pendingRecurringReview, setPendingRecurringReview] = useState(null);
  const [
    selectedContributionForRecording,
    setSelectedContributionForRecording,
  ] = useState(null);
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
    loading: referenceDataLoading,
    error: referenceDataError,
    reload: reloadReferenceData,
  } = useInvestmentReferenceData();
  const dashboardEnabled = activeView === "dashboard";
  const investmentEventsQuery = useInvestmentEventsData(activeView === "calendar");
  const dashboardAnalyticsQuery = useInvestmentDashboardAnalytics(dashboardEnabled);
  const investmentEvents = investmentEventsQuery.data || [];
  const loading =
    investmentsLoading ||
    referenceDataLoading ||
    (dashboardEnabled && dashboardAnalyticsQuery.isLoading);
  const error =
    uiError ||
    (pageDataError
      ? "Failed to load investments"
      : referenceDataError
        ? "Failed to load investment reference data"
        : dashboardEnabled && dashboardAnalyticsQuery.error
          ? "Failed to load investment dashboard"
        : "");

  const summaryInvestments = useMemo(
    () =>
      Array.isArray(rawInvestments)
        ? getNormalizedInvestments(rawInvestments, taxonomyNodes)
        : [],
    [rawInvestments, taxonomyNodes],
  );

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
    categoryFilter !== "all";
  const isFirstInvestmentSetup =
    summaryInvestments.length === 0 && !hasInvestmentFilters;

  const localDashboardKpis = getInvestmentDashboardKpis(summaryInvestments);

  const localCategoryBreakdown = useMemo(
    () => getInvestmentCategoryBreakdown(summaryInvestments, taxonomyNodes),
    [summaryInvestments, taxonomyNodes],
  );

  const categoryOptions = getInvestmentCategoryOptions(taxonomyNodes);

  const categoryLabelMap = getInvestmentCategoryLabelMap(taxonomyNodes);
  const localValueSourceSummary = useMemo(
    () => getInvestmentValueSourceSummary(summaryInvestments),
    [summaryInvestments],
  );
  const dashboardAnalytics = dashboardAnalyticsQuery.data?.analytics;
  const categoryPerformanceRows = useMemo(() => {
    if (Array.isArray(dashboardAnalytics?.categoryPerformanceRows)) {
      return dashboardAnalytics.categoryPerformanceRows.map((item) => ({
        ...item,
        label: categoryLabelMap[item.key] || item.label || item.key,
        sparkline: Array.isArray(item.sparkline) ? item.sparkline : [],
        investmentIds: Array.isArray(item.investmentIds) ? item.investmentIds : [],
      }));
    }

    return getInvestmentCategoryPerformanceRows(
      summaryInvestments,
      categoryLabelMap,
      12,
    );
  }, [dashboardAnalytics, summaryInvestments, categoryLabelMap]);

  const timeSeriesData = useMemo(() => {
    const timeSeries = dashboardAnalytics?.timeSeries;

    if (selectedYearForDrill) {
      return (
        timeSeries?.monthlyByYear?.[selectedYearForDrill] ||
        getInvestmentTimeSeriesData(summaryInvestments, selectedYearForDrill)
      );
    }

    return timeSeries?.yearly || getInvestmentTimeSeriesData(summaryInvestments, null);
  }, [dashboardAnalytics, summaryInvestments, selectedYearForDrill]);

  const portfolioGrowthData = useMemo(
    () =>
      dashboardAnalytics?.portfolioGrowthData ||
      getInvestmentPortfolioGrowthData(summaryInvestments),
    [dashboardAnalytics, summaryInvestments],
  );

  const dashboardKpis = dashboardAnalyticsQuery.data?.summary
    ? {
        totalInvestments: Number(
          dashboardAnalyticsQuery.data.summary.totalInvestments ?? localDashboardKpis.totalInvestments,
        ),
        totalInvested: Number(
          dashboardAnalyticsQuery.data.summary.totalInvested ?? localDashboardKpis.totalInvested,
        ),
        totalCurrentValue: Number(
          dashboardAnalyticsQuery.data.summary.totalCurrentValue ?? localDashboardKpis.totalCurrentValue,
        ),
        totalReturn: Number(
          dashboardAnalyticsQuery.data.summary.totalReturn ?? localDashboardKpis.totalReturn,
        ),
        returnPercentage: Number(
          dashboardAnalyticsQuery.data.summary.returnPercentage ?? localDashboardKpis.returnPercentage,
        ),
        upcomingMaturity: Number(
          dashboardAnalyticsQuery.data.summary.upcomingMaturity ?? localDashboardKpis.upcomingMaturity,
        ),
        insuranceCover: Number(
          dashboardAnalyticsQuery.data.summary.insuranceCover ?? localDashboardKpis.insuranceCover,
        ),
      }
    : localDashboardKpis;

  const valueSourceSummary =
    dashboardAnalyticsQuery.data?.summary?.valueSourceSummary || localValueSourceSummary;

  const categoryBreakdown = Array.isArray(dashboardAnalyticsQuery.data?.categoryBreakdown)
    ? dashboardAnalyticsQuery.data.categoryBreakdown.map((item) => ({
        key: item.key,
        label: categoryLabelMap[item.key] || item.key,
        value: Number(item.invested || 0),
        investmentIds: Array.isArray(item.investmentIds) ? item.investmentIds : [],
      }))
    : localCategoryBreakdown;

  const topCurrentValueItems =
    dashboardAnalyticsQuery.data?.upcoming?.topCurrentValueItems ||
    getTopInvestmentCurrentValueItems(summaryInvestments);

  const recentInvestments =
    dashboardAnalyticsQuery.data?.upcoming?.recentInvestments ||
    getRecentInvestments(summaryInvestments);

  const upcomingContributions = dashboardAnalyticsQuery.data?.upcoming?.upcomingContributions
    ? getInvestmentContributionViewItems(dashboardAnalyticsQuery.data.upcoming.upcomingContributions)
    : getInvestmentContributionViewItems(summaryInvestments);

  const calendarGroups = getInvestmentCalendarGroups(summaryInvestments);

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

  const openRecordContributionModal = (investment, contributionPlan) => {
    setSelectedContributionForRecording({ investment, contributionPlan });
    setRecordContributionModalOpen(true);
  };

  const closeRecordContributionModal = () => {
    setRecordContributionModalOpen(false);
    setSelectedContributionForRecording(null);
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

  const columns = [
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
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 145,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography variant="body2">
            {getInvestmentCategoryLabel(row.category, taxonomyNodes)}
          </Typography>
        </Box>
      ),
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
            : metrics.returnAmount > 0
              ? "success.main"
              : metrics.returnAmount < 0
                ? "error.main"
                : "text.primary";

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
              {metrics
                ? formatInvestmentCurrency(metrics.returnAmount)
                : "Not available"}
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
          <Typography variant="body2">
            {formatInvestmentDate(row.maturityDate)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <StatusChip
            label={row.status}
            tone={getInvestmentStatusTone(row.status)}
          />
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
            variant="contained"
            disableElevation
            onClick={() => openViewDrawer(row)}
            aria-label={`View ${row.name}`}
            sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
          >
            <Icon path={mdiEyeOutline} size={0.8} />
          </IconButton>
          <IconButton
            size="small"
            variant="contained"
            disableElevation
            onClick={() => openEditDrawer(row)}
            aria-label={`Edit ${row.name}`}
            sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
          >
            <Icon path={mdiPencilOutline} size={0.8} />
          </IconButton>
          <IconButton
            size="small"
            variant="contained"
            disableElevation
            color="error"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
          >
            <Icon path={mdiDeleteOutline} size={0.8} />
          </IconButton>
        </Box>
      ),
    },
  ];

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
      categoryLabelMap={categoryLabelMap}
      valueSourceSummary={valueSourceSummary}
      categoryPerformanceRows={categoryPerformanceRows}
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
      categoryOptions={categoryOptions}
      onResetFilters={handleResetFilters}
      onCreateInvestment={openCreateDrawer}
      onRecordContribution={openRecordContributionModal}
      formatCurrency={formatInvestmentCurrency}
    />
  );

  const renderCalendarView = () => (
    <InvestmentsCalendarView
      calendarGroups={calendarGroups}
      investmentEvents={investmentEvents}
      investments={summaryInvestments}
      categoryLabelMap={categoryLabelMap}
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
            <Paper
              variant="outlined"
              sx={{
                p: 0.5,
                display: "inline-flex",
                gap: 0.5,
                borderRadius: 1,
                flexWrap: "wrap",
              }}
            >
              {VIEW_OPTIONS.map((option) => {
                const selected = activeView === option.value;
                return (
                  <AppButton
                    key={option.value}
                    variant={selected ? "contained" : "text"}
                    onClick={() => setActiveView(option.value)}
                    sx={{ minWidth: 110 }}
                  >
                    {option.label}
                  </AppButton>
                );
              })}
            </Paper>
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
      {!loading && isFirstInvestmentSetup && activeView === "dashboard" ? (
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
      {!loading && !isFirstInvestmentSetup && activeView === "dashboard"
        ? renderDashboardView()
        : null}
      {!loading && activeView === "calendar" ? renderCalendarView() : null}

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
        taxonomyNodes={taxonomyNodes}
        onEdit={openEditDrawer}
      />

      <InvestmentAssetTaxonomyFormDrawer
        open={assetTaxonomyDrawerOpen}
        onClose={closeAssetTaxonomyDrawer}
        onSubmit={handleSaveAssetTaxonomy}
        onDelete={handleDeleteAssetTaxonomy}
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

      <RecordContributionModal
        open={recordContributionModalOpen}
        onClose={closeRecordContributionModal}
        investment={selectedContributionForRecording?.investment}
        contributionPlan={selectedContributionForRecording?.contributionPlan}
        accounts={accounts}
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
