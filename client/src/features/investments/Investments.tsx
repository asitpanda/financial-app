// @ts-nocheck
import React, { useMemo, useState } from "react";
import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiEyeOutline, mdiPencilOutline } from "@mdi/js";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import dayjs from "dayjs";
import InvestmentAssetTaxonomyFormDrawer from "./components/InvestmentAssetTaxonomyFormDrawer";
import InvestmentFormDrawer from "./components/InvestmentFormDrawer";
import RecurringOccurrencesReviewDialog from "./components/RecurringOccurrencesReviewDialog";
import AppButton from "../../components/common/AppButton";
import { EmptyState, StatusChip } from "../../components/common";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";
import { InvestmentViewDrawer } from "./components/InvestmentViewDrawer";
import InvestmentsAssetsView from "./components/InvestmentsAssetsView";
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
  useInvestmentPageData,
  useRemoveInvestment,
  useSaveInvestment,
} from "./hooks/useInvestments";
import {
  useRemoveInvestmentAssetTaxonomy,
  useSaveInvestmentAssetTaxonomy,
} from "./hooks/useInvestmentAssetTaxonomy";
import {
  getFilteredInvestments,
  getInvestmentCalendarGroups,
  getInvestmentCategoryBreakdown,
  getInvestmentCategoryLabelMap,
  getInvestmentDashboardKpis,
  getInvestmentSelectedById,
  getInvestmentTimeSeriesData,
  getNormalizedInvestments,
  getRecentInvestments,
  getTopInvestmentCurrentValueItems,
  getUpcomingMaturityItems,
  getInvestmentContributionViewItems,
} from "./investments.selectors";
import {
  previewRecurringContributionPlan,
  confirmRecurringContributionPlan,
} from "./api/contributionPlans.api";

const VIEW_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "assets", label: "Assets" },
  { value: "calendar", label: "Calendar" },
];

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

export const buildReviewedHistoricalItems = (occurrences) =>
  Array.isArray(occurrences)
    ? occurrences.map((item) => ({
        dueDate: item.dueDate,
        amount: Number(item.amount || 0),
        selected: item.selected !== false,
        status: item.suggestedStatus || "PENDING",
        eventDate: item.dueDate,
        eventType: item.eventType || "CONTRIBUTION",
        sequenceNumber: item.sequenceNumber,
        notes: item.source ? `Generated via ${item.source}` : "",
      }))
    : [];

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
  const saveTaxonomyMutation = useSaveInvestmentAssetTaxonomy();
  const removeTaxonomyMutation = useRemoveInvestmentAssetTaxonomy();
  const {
    investments: rawInvestments,
    taxonomyNodes,
    accounts,
    loading,
    error: pageDataError,
    reload,
  } = useInvestmentPageData();
  const error = uiError || (pageDataError ? "Failed to load investments" : "");

  const investments = useMemo(
    () =>
      Array.isArray(rawInvestments)
        ? getNormalizedInvestments(rawInvestments, taxonomyNodes)
        : [],
    [rawInvestments, taxonomyNodes],
  );

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

  const filteredInvestments = getFilteredInvestments(investments, {
    search,
    statusFilter,
    categoryFilter,
  });
  const hasInvestmentFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    categoryFilter !== "all";
  const isFirstInvestmentSetup =
    investments.length === 0 && !hasInvestmentFilters;

  const dashboardKpis = getInvestmentDashboardKpis(investments);

  const topCurrentValueItems = getTopInvestmentCurrentValueItems(investments);

  const upcomingMaturityItems = getUpcomingMaturityItems(investments);

  const recentInvestments = getRecentInvestments(investments);

  const upcomingContributions = getInvestmentContributionViewItems(investments);

  const categoryBreakdown = useMemo(
    () => getInvestmentCategoryBreakdown(investments, taxonomyNodes),
    [investments, taxonomyNodes],
  );

  const categoryOptions = getInvestmentCategoryOptions(taxonomyNodes);

  const categoryLabelMap = getInvestmentCategoryLabelMap(taxonomyNodes);

  const timeSeriesData = getInvestmentTimeSeriesData(
    investments,
    selectedYearForDrill,
  );

  const calendarGroups = getInvestmentCalendarGroups(investments);

  const selectedInvestment = getInvestmentSelectedById(
    investments,
    selectedInvestmentId,
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

  const openRecordContributionModal = (investment, contributionPlan) => {
    setSelectedContributionForRecording({ investment, contributionPlan });
    setRecordContributionModalOpen(true);
  };

  const closeRecordContributionModal = () => {
    setRecordContributionModalOpen(false);
    setSelectedContributionForRecording(null);
  };

  const handleContributionRecorded = async (response) => {
    // Refresh the investment data
    try {
      await reload();
      pushNotification({
        type: "success",
        message: "Contribution recorded and investment data updated",
      });
    } catch (error) {
      pushNotification({
        type: "error",
        message: "Contribution recorded but failed to refresh data",
      });
    }
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
      const savedInvestment = await saveInvestmentMutation.mutateAsync({
        payload: nextInvestment,
        selectedInvestmentId:
          drawerMode === "edit" ? selectedInvestmentId : null,
      });

      const wantsRecurringPlan = formValues?.contributionType === "recurring";
      const alreadyHasActivePlan =
        drawerMode === "edit" &&
        Boolean(selectedInvestment?.activeContributionPlan);
      const requestedHistoricalMode =
        formValues?.recurringPlan?.historicalImportMode || "TRACK_FROM_TODAY";

      if (wantsRecurringPlan && !alreadyHasActivePlan) {
        const targetInvestmentId =
          drawerMode === "edit"
            ? selectedInvestmentId
            : savedInvestment?.id ||
              savedInvestment?.investment?.id ||
              savedInvestment?.data?.id;

        if (targetInvestmentId) {
          const recurringPayload =
            buildRecurringPayloadFromFormValues(formValues);
          const preview = await previewRecurringContributionPlan(
            targetInvestmentId,
            recurringPayload,
          );

          setPendingRecurringReview({
            targetInvestmentId,
            recurringPayload,
            reviewedHistoricalItems: buildReviewedHistoricalItems(
              preview?.occurrences,
            ),
            historicalImportMode: recurringPayload.historicalImportMode,
            investmentName: nextInvestment.name,
          });

          setReviewDialogOpen(true);
          await reload();
          closeInvestmentDrawer();

          pushNotification({
            type: "info",
            message:
              "Investment saved. Review historical occurrences before confirming recurring plan.",
          });
          return null;
        }

        pushNotification({
          type: "error",
          message:
            "Investment saved, but could not open recurring review because investment ID was not available in the save response.",
        });

        return "Investment saved, but recurring review could not be opened. Please refresh and retry.";
      }

      await reload();

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

      if (
        wantsRecurringPlan &&
        alreadyHasActivePlan &&
        requestedHistoricalMode !== "TRACK_FROM_TODAY"
      ) {
        pushNotification({
          type: "warning",
          message:
            "Historical review was skipped because this investment already has an active recurring plan. Update or replace the existing plan first.",
        });
      }

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

  const handleRecurringOccurrenceChange = (index, patch) => {
    setPendingRecurringReview((current) => {
      if (!current) return current;
      const nextItems = [...current.reviewedHistoricalItems];
      nextItems[index] = {
        ...nextItems[index],
        ...patch,
      };

      return {
        ...current,
        reviewedHistoricalItems: nextItems,
      };
    });
  };

  const handleCancelRecurringReview = async () => {
    setReviewDialogOpen(false);
    setPendingRecurringReview(null);
    await reload();
    pushNotification({
      type: "warning",
      message:
        "Recurring plan setup cancelled. Investment was saved without a recurring plan.",
    });
  };

  const handleConfirmRecurringReview = async () => {
    if (!pendingRecurringReview) return;

    setRecurringConfirmLoading(true);
    try {
      await confirmRecurringContributionPlan(
        pendingRecurringReview.targetInvestmentId,
        buildRecurringConfirmPayload(
          pendingRecurringReview.recurringPayload,
          pendingRecurringReview.reviewedHistoricalItems,
        ),
      );

      await reload();
      setReviewDialogOpen(false);
      setPendingRecurringReview(null);
      pushNotification({
        type: "success",
        message: "Recurring plan confirmed",
      });
    } catch (error) {
      pushNotification({
        type: "error",
        message: getRuntimeErrorMessage(
          error,
          "Failed to confirm recurring plan",
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
        await reload();
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
        await reload();
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
        await reload();
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
            {row.type}
          </Typography>
        </Box>
      ),
    },
    {
      field: "institution",
      headerName: "Institution",
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography variant="body2">{row.institution}</Typography>
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
      minWidth: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography variant="body2">
            {getInvestmentCategoryLabel(row.category, taxonomyNodes)}
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
      investments={investments}
      timeSeriesData={timeSeriesData}
      isDrillMode={Boolean(selectedYearForDrill)}
      onDrillYear={setSelectedYearForDrill}
      onResetDrill={() => setSelectedYearForDrill(null)}
      dashboardKpis={dashboardKpis}
      categoryBreakdown={categoryBreakdown}
      categoryLabelMap={categoryLabelMap}
      topCurrentValueItems={topCurrentValueItems}
      upcomingContributions={upcomingContributions}
      upcomingMaturityItems={upcomingMaturityItems}
      recentInvestments={recentInvestments}
      taxonomyNodes={taxonomyNodes}
      onCreateInvestment={openCreateDrawer}
      onRecordContribution={openRecordContributionModal}
      formatCurrency={formatInvestmentCurrency}
    />
  );

  const renderAssetsView = () => (
    <InvestmentsAssetsView
      filteredInvestments={filteredInvestments}
      columns={columns}
      search={search}
      onSearchChange={setSearch}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={setCategoryFilter}
      categoryOptions={categoryOptions}
      onResetFilters={handleResetFilters}
      onOpenAssetTaxonomyDrawer={openAssetTaxonomyDrawer}
      onCreateInvestment={openCreateDrawer}
      isFirstInvestmentSetup={isFirstInvestmentSetup}
    />
  );

  const renderCalendarView = () => (
    <InvestmentsCalendarView calendarGroups={calendarGroups} />
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
              Manage Assets
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
      {!loading && activeView === "assets" ? renderAssetsView() : null}
      {!loading && activeView === "calendar" ? renderCalendarView() : null}

      <InvestmentFormDrawer
        open={drawerOpen && drawerMode !== "view"}
        onClose={closeInvestmentDrawer}
        onSubmit={handleSaveInvestment}
        initialValues={drawerMode === "edit" ? selectedInvestment : null}
        accounts={accounts}
        taxonomyNodes={taxonomyNodes}
        title={drawerMode === "edit" ? "Edit Investment" : "Add Investment"}
        submitLabel={drawerMode === "edit" ? "Update" : "Add"}
      />

      <InvestmentViewDrawer
        open={drawerOpen && drawerMode === "view"}
        onClose={closeInvestmentDrawer}
        investment={selectedInvestment}
        taxonomyNodes={taxonomyNodes}
        onEdit={openEditDrawer}
        onPlanUpdated={reload}
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
        onContributionRecorded={handleContributionRecorded}
      />

      <RecurringOccurrencesReviewDialog
        open={reviewDialogOpen}
        loading={recurringConfirmLoading}
        items={pendingRecurringReview?.reviewedHistoricalItems || []}
        historicalImportMode={pendingRecurringReview?.historicalImportMode}
        investmentName={pendingRecurringReview?.investmentName}
        onCancel={handleCancelRecurringReview}
        onConfirm={handleConfirmRecurringReview}
        onChangeItem={handleRecurringOccurrenceChange}
      />
    </Box>
  );
}
