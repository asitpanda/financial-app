// @ts-nocheck
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiEyeOutline, mdiPencilOutline } from "@mdi/js";
import {
  Alert,
  Box,
  MenuItem,
  Select,
  IconButton,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useHeaderAction } from "../../hooks/useHeaderAction";
import { useViewportTableHeight } from "../../hooks/useViewportTableHeight";
import {
  matchesPageDateFilter,
  usePageDateFilterStore,
} from "../../store/pageDateFilterStore";
import GoalFormDrawer from "./components/GoalFormDrawer";
import {
  DataTable,
  EmptyState,
  FilterBar,
  KpiCard,
  SearchBar,
  SectionCard,
  StatusChip,
} from "../../components/common";
import { GoalViewDrawer } from "./components/GoalViewDrawer";
import { ConfirmDialog } from "../../components/dialogs";
import { useDrawerStore } from "../../store/drawerStore";
import { useDialogStore } from "../../store/dialogStore";
import { useNotificationStore } from "../../store/notificationStore";
import {
  closeDialog,
  closeDrawer,
  navigateTo,
  openDialog,
  openDrawer,
} from "../../services/navigation";
import { useGoalPageData, useRemoveGoal, useSaveGoal } from "./useGoals";
import {
  formatCurrency,
  getFilteredGoals,
  getGoalHealth,
  getGoalId,
  getGoalInsights,
  getGoalProgressChart,
  getGoalRows,
  getTableGoals,
} from "./goals.selectors";
import type { GoalProgressFilter } from "./goal.types";

const getInitialDateFilter = () => ({
  dateRange: [null, null],
  dateRangeShortcut: "all",
});

export default function Goals() {
  const goalTableRef = useRef(null);
  const [uiError, setUiError] = useState("");
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );
  const saveGoalMutation = useSaveGoal();
  const deleteGoalMutation = useRemoveGoal();
  const {
    goals,
    transactions,
    loading,
    error: pageDataError,
    reload,
  } = useGoalPageData();
  const transactionsLoading = loading;
  const error = uiError || (pageDataError ? "Failed to load goals" : "");

  const drawerOpen = useDrawerStore((state) => state.open);
  const drawerType = useDrawerStore((state) => state.type);
  const drawerMode = useDrawerStore((state) => state.mode);
  const drawerEntityId = useDrawerStore((state) => state.entityId);

  const dialogOpen = useDialogStore((state) => state.open);
  const dialogType = useDialogStore((state) => state.type);
  const dialogPayload = useDialogStore((state) => state.payload);

  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] =
    useState<GoalProgressFilter>("all");
  const [tableProgressFilter, setTableProgressFilter] =
    useState<GoalProgressFilter>("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [dateRangeShortcut, setDateRangeShortcut] = useState("all");

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const periodMode = usePageDateFilterStore((state) => state.mode);
  const selectedYear = usePageDateFilterStore((state) => state.selectedYear);
  const selectedMonth = usePageDateFilterStore((state) => state.selectedMonth);

  const openAddDrawer = () => {
    openDrawer({ type: "goal", mode: "create", step: "form" });
  };

  useHeaderAction("goals", {
    label: "Goal",
    onClick: openAddDrawer,
    disabled: loading,
  });

  const openEditDrawer = useCallback((goal) => {
    openDrawer({
      type: "goal",
      mode: "edit",
      entityId: getGoalId(goal),
      step: "form",
    });
  }, []);

  const openViewDrawer = useCallback((goal) => {
    openDrawer({
      type: "goal",
      mode: "view",
      entityId: getGoalId(goal),
      step: "overview",
    });
  }, []);

  const selectedGoal = useMemo(() => {
    if (!drawerEntityId || drawerType !== "goal") return null;
    return goals.find((goal) => getGoalId(goal) === drawerEntityId) || null;
  }, [goals, drawerEntityId, drawerType]);

  const isGoalFormDrawerOpen =
    drawerOpen &&
    drawerType === "goal" &&
    (drawerMode === "create" || drawerMode === "edit");

  const isGoalViewDrawerOpen =
    drawerOpen && drawerType === "goal" && drawerMode === "view";

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setProgressFilter("all");
    setTableProgressFilter("all");
    const initialDateFilter = getInitialDateFilter();
    setDateRange(initialDateFilter.dateRange);
    setDateRangeShortcut(initialDateFilter.dateRangeShortcut);
  }, []);

  const applyDateRangeShortcut = (shortcut) => {
    setDateRangeShortcut(shortcut);

    if (shortcut === "all") {
      setDateRange([null, null]);
      return;
    }

    if (shortcut === "custom") return;

    const now = dayjs();
    if (shortcut === "last7") {
      setDateRange([now.subtract(6, "day"), now]);
      return;
    }
    if (shortcut === "last30") {
      setDateRange([now.subtract(29, "day"), now]);
      return;
    }
    if (shortcut === "thisMonth") {
      setDateRange([now.startOf("month"), now.endOf("month")]);
      return;
    }
    if (shortcut === "thisYear") {
      setDateRange([now.startOf("year"), now.endOf("year")]);
    }
  };

  const focusGoalTable = useCallback(() => {
    requestAnimationFrame(() => {
      goalTableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const handleGoalProgressFilterSelect = useCallback(
    (filterKey) => {
      setTableProgressFilter(filterKey);
      focusGoalTable();
    },
    [focusGoalTable],
  );

  const handleGoalTableDrilldown = useCallback(
    (filterKey = "all") => {
      setTableProgressFilter(filterKey);
      focusGoalTable();
    },
    [focusGoalTable],
  );

  const filteredGoals = useMemo(
    () =>
      getFilteredGoals(goals, {
        search,
        progressFilter,
        dateRange,
        periodMode,
        selectedYear,
        selectedMonth,
        matchesPageDateFilter,
      }),
    [
      goals,
      search,
      progressFilter,
      dateRange,
      periodMode,
      selectedYear,
      selectedMonth,
    ],
  );

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [search, progressFilter, tableProgressFilter, dateRange]);

  const tableGoals = useMemo(
    () => getTableGoals(filteredGoals, tableProgressFilter),
    [filteredGoals, tableProgressFilter],
  );

  const rows = useMemo(() => getGoalRows(tableGoals), [tableGoals]);
  const tableHeight = useViewportTableHeight(goalTableRef, {
    bottomOffset: 50,
    minHeight: 360,
    defaultHeight: 620,
    deps: [loading, error, rows.length],
  });

  const goalInsights = useMemo(
    () => getGoalInsights(filteredGoals),
    [filteredGoals],
  );
  const hasGoalFilters =
    Boolean(search.trim()) ||
    progressFilter !== "all" ||
    tableProgressFilter !== "all" ||
    dateRangeShortcut !== "all" ||
    Boolean(dateRange[0]) ||
    Boolean(dateRange[1]);
  const isFirstGoalSetup = goals.length === 0 && !hasGoalFilters;
  const goalTableEmptyState = isFirstGoalSetup
    ? {
        title: "No goals created yet",
        description:
          "Add your first goal to track target amounts, progress, and upcoming deadlines.",
        actionLabel: "Add Goal",
        onAction: openAddDrawer,
      }
    : {
        title: "No goals found",
        description:
          "Adjust your filters or add a new goal to start tracking progress.",
        actionLabel: "Add Goal",
        onAction: openAddDrawer,
      };

  const goalProgressChart = useMemo(
    () => getGoalProgressChart(filteredGoals, goalInsights.totalGoals),
    [filteredGoals, goalInsights.totalGoals],
  );

  const handleSubmitGoal = async (payload) => {
    try {
      await saveGoalMutation.mutateAsync({ payload, selectedGoal });
      closeDrawer();
      setUiError("");
      await reload();
      return undefined;
    } catch (e) {
      void e;
      const message = selectedGoal
        ? "Failed to update goal"
        : "Failed to add goal";
      setUiError(message);
      pushNotification({ type: "error", message });
      return message;
    }
  };

  const handleDelete = useCallback(async () => {
    const payload =
      dialogPayload && typeof dialogPayload === "object" ? dialogPayload : null;
    const targetId = payload && payload.id ? String(payload.id) : "";
    if (!targetId) return;

    try {
      await deleteGoalMutation.mutateAsync(targetId);
      closeDialog();
      setUiError("");
      await reload();
    } catch (e) {
      void e;
      const message = "Failed to delete goal";
      setUiError(message);
      pushNotification({ type: "error", message });
    }
  }, [deleteGoalMutation, dialogPayload, pushNotification, reload]);

  const isGoalDeleteDialogOpen =
    dialogOpen &&
    dialogType === "confirmDelete" &&
    dialogPayload &&
    typeof dialogPayload === "object" &&
    dialogPayload.entity === "goal";

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Goal",
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: "targetAmount",
        headerName: "Target",
        type: "number",
        flex: 1,
        minWidth: 140,
        valueFormatter: (value) => formatCurrency(value),
      },
      {
        field: "currentAmount",
        headerName: "Saved",
        type: "number",
        flex: 1,
        minWidth: 140,
        valueFormatter: (value) => formatCurrency(value),
      },
      {
        field: "progress",
        headerName: "Progress",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
          <StatusChip
            label={`${params.value}%`}
            tone={params.value >= 100 ? "success" : "info"}
          />
        ),
      },
      {
        field: "deadline",
        headerName: "Deadline",
        flex: 1,
        minWidth: 150,
        valueFormatter: (value) =>
          value ? new Date(value).toLocaleDateString() : "Not set",
      },
      {
        field: "health",
        headerName: "Health",
        flex: 1,
        minWidth: 140,
        sortable: false,
        renderCell: (params) => {
          const health = getGoalHealth(params.row.goal);
          return <StatusChip label={health.label} tone={health.tone} />;
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        flex: 0.9,
        minWidth: 170,
        renderCell: (params) => {
          const goalName = params.row.name || "goal";

          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                height: "100%",
              }}
            >
              <IconButton
                size="small"
                variant="contained"
                disableElevation
                title={`View ${goalName}`}
                aria-label={`View ${goalName}`}
                onClick={() => openViewDrawer(params.row.goal)}
                sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
              >
                <Icon path={mdiEyeOutline} size={0.8} />
              </IconButton>
              <IconButton
                size="small"
                variant="contained"
                disableElevation
                title={`Edit ${goalName}`}
                aria-label={`Edit ${goalName}`}
                onClick={() => openEditDrawer(params.row.goal)}
                sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
              >
                <Icon path={mdiPencilOutline} size={0.8} />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                variant="contained"
                disableElevation
                title={`Delete ${goalName}`}
                aria-label={`Delete ${goalName}`}
                onClick={() =>
                  openDialog("confirmDelete", {
                    entity: "goal",
                    id: params.row.id,
                    name: params.row.name,
                  })
                }
                sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
              >
                <Icon path={mdiDeleteOutline} size={0.8} />
              </IconButton>
            </Box>
          );
        },
      },
    ],
    [openEditDrawer, openViewDrawer],
  );

  return (
    <main className="flex-1 w-full">
      <div className="w-full">
        {error && !drawerOpen && !dialogOpen ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {!loading && isFirstGoalSetup ? (
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
              title="No goals created yet"
              description="Add your first goal to track target amounts, progress, and upcoming deadlines."
              actionLabel="Add Goal"
              onAction={openAddDrawer}
            />
          </Box>
        ) : null}

        {!loading && !isFirstGoalSetup && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <KpiCard
              title="Total Goal Target"
              value={formatCurrency(goalInsights.totalTarget)}
              delta={`${goalInsights.totalGoals} goals`}
              deltaTone="neutral"
              onClick={() => handleGoalTableDrilldown("all")}
            />
            <KpiCard
              title="Saved So Far"
              value={formatCurrency(goalInsights.totalSaved)}
              delta={`${goalInsights.progressPercent}% of total target`}
              deltaTone="positive"
              onClick={() => handleGoalTableDrilldown("all")}
            />
            <KpiCard
              title="Completed Goals"
              value={goalInsights.completed}
              delta={`${goalInsights.onTrack} on track`}
              deltaTone="positive"
              onClick={() => handleGoalTableDrilldown("completed")}
            />
            <KpiCard
              title="At Risk Goals"
              value={goalInsights.atRisk}
              delta={`${goalInsights.notStarted} not started`}
              deltaTone={goalInsights.atRisk > 0 ? "negative" : "neutral"}
              onClick={() => handleGoalTableDrilldown("atRisk")}
            />
          </Box>
        )}

        {!loading && !isFirstGoalSetup && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "1.2fr 1fr" },
              gap: 1.5,
              mb: 2,
            }}
          >
            <SectionCard
              title="Goal Progress Overview"
              empty={goalInsights.totalGoals === 0}
              emptyState={{
                title: "No goal progress yet",
                description:
                  "Create a goal to populate progress insights and completion trends.",
                actionLabel: "Add Goal",
                onAction: openAddDrawer,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "220px minmax(0, 1fr)",
                  },
                  gap: 3,
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Box
                    component="svg"
                    viewBox="0 0 160 160"
                    sx={{ width: 200, height: 200 }}
                    aria-label="Goal progress donut chart"
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r="54"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="18"
                    />
                    {goalProgressChart.segments.map((segment) =>
                      segment.dash > 0 ? (
                        <circle
                          key={segment.key}
                          cx="80"
                          cy="80"
                          r="54"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="18"
                          strokeLinecap="butt"
                          strokeDasharray={`${segment.dash} ${segment.gap}`}
                          strokeDashoffset={-segment.offset}
                          transform="rotate(-90 80 80)"
                          onClick={() =>
                            handleGoalProgressFilterSelect(segment.key)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <title>{`${segment.label}: ${segment.count} (${(segment.fraction * 100).toFixed(0)}%)`}</title>
                        </circle>
                      ) : null,
                    )}
                    <circle cx="80" cy="80" r="33" fill="#ffffff" />
                    <text
                      x="80"
                      y="74"
                      textAnchor="middle"
                      fill="#6b7280"
                      fontSize="10"
                    >
                      Goals
                    </text>
                    <text
                      x="80"
                      y="92"
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="18"
                      fontWeight="700"
                    >
                      {goalInsights.totalGoals}
                    </text>
                  </Box>
                </Box>

                <Box sx={{ display: "grid", gap: 1.25 }}>
                  {goalProgressChart.segments.map((segment) => (
                    <Box
                      key={segment.key}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 1,
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        handleGoalProgressFilterSelect(segment.key)
                      }
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          minWidth: 0,
                        }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: segment.color,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {segment.label}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          flexShrink: 0,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {segment.count} goals
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: 1,
                          }}
                        >
                          •
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: segment.color }}
                        >
                          {formatCurrency(segment.totalValue)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: 1,
                          }}
                        >
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(segment.fraction * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </SectionCard>

            <SectionCard
              title="Upcoming Deadlines"
              empty={goalInsights.upcomingDeadlines.length === 0}
              emptyState={{
                title: "No upcoming deadlines",
                description: "Goals with target deadlines will appear here.",
              }}
            >
              <Box sx={{ display: "grid", gap: 1.25 }}>
                {goalInsights.upcomingDeadlines.map((goal) => (
                  <Box
                    key={getGoalId(goal)}
                    onClick={() => openViewDrawer(goal)}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1,
                      cursor: "pointer",
                      transition:
                        "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Box>
                      <Box sx={{ fontWeight: 600, fontSize: 13 }}>
                        {goal.name || "Untitled Goal"}
                      </Box>
                      <Box sx={{ color: "text.secondary", fontSize: 12 }}>
                        {new Date(goal.deadline).toLocaleDateString()}
                      </Box>
                    </Box>
                    <StatusChip
                      label={`${getProgress(goal)}%`}
                      tone={getProgress(goal) >= 100 ? "success" : "info"}
                    />
                  </Box>
                ))}
              </Box>
            </SectionCard>
          </Box>
        )}

        {!isFirstGoalSetup ? (
          <Box ref={goalTableRef}>
            <SectionCard
              title="Goal Details Table"
              empty={!loading && rows.length === 0}
              emptyState={goalTableEmptyState}
            >
              {!loading && (
                <FilterBar onReset={handleResetFilters}>
                  <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search goals"
                  />

                  <Select
                    value={progressFilter}
                    onChange={(e) => {
                      setProgressFilter(e.target.value);
                      setTableProgressFilter("all");
                    }}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="all">All Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="onTrack">On Track</MenuItem>
                    <MenuItem value="atRisk">At Risk</MenuItem>
                    <MenuItem value="notStarted">Not Started</MenuItem>
                  </Select>

                  <Select
                    value={dateRangeShortcut}
                    onChange={(e) => applyDateRangeShortcut(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="all">Date Range: All Time</MenuItem>
                    <MenuItem value="last7">Date Range: Last 7 Days</MenuItem>
                    <MenuItem value="last30">Date Range: Last 30 Days</MenuItem>
                    <MenuItem value="thisMonth">
                      Date Range: This Month
                    </MenuItem>
                    <MenuItem value="thisYear">Date Range: This Year</MenuItem>
                    <MenuItem value="custom">Date Range: Custom</MenuItem>
                  </Select>

                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="From"
                      value={dateRange[0]}
                      onChange={(value) => {
                        setDateRange([value, dateRange[1]]);
                        setDateRangeShortcut("custom");
                      }}
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                  </LocalizationProvider>

                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="To"
                      value={dateRange[1]}
                      onChange={(value) => {
                        setDateRange([dateRange[0], value]);
                        setDateRangeShortcut("custom");
                      }}
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                  </LocalizationProvider>
                </FilterBar>
              )}

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <DataTable
                  rows={rows}
                  columns={columns}
                  pagination
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  rowBufferPx={400}
                  columnBufferPx={300}
                  containerSx={{ height: tableHeight }}
                  initialState={{
                    sorting: {
                      sortModel: [{ field: "deadline", sort: "asc" }],
                    },
                  }}
                />
              )}
            </SectionCard>
          </Box>
        ) : null}

        <GoalFormDrawer
          open={isGoalFormDrawerOpen}
          onClose={closeDrawer}
          onSubmit={handleSubmitGoal}
          initialValues={selectedGoal}
          title={selectedGoal ? "Edit Goal" : "Add Goal"}
          submitLabel={selectedGoal ? "Update" : "Add"}
        />

        <GoalViewDrawer
          open={isGoalViewDrawerOpen}
          onClose={closeDrawer}
          goal={selectedGoal}
          transactions={transactions}
          transactionsLoading={transactionsLoading}
          onCreateGoal={() => {
            closeDrawer();
            openAddDrawer();
          }}
          onDelete={(goal) => {
            closeDrawer();
            openDialog("confirmDelete", {
              entity: "goal",
              id: getGoalId(goal),
              name: goal.name || "Untitled Goal",
            });
          }}
          onEdit={(goal) => {
            openDrawer({
              type: "goal",
              mode: "edit",
              entityId: getGoalId(goal),
              step: "form",
            });
          }}
          onAddTransaction={(goal) => {
            navigateTo("transactions");
            openDrawer({
              type: "transaction",
              mode: "create",
              entityId: getGoalId(goal),
              step: "form",
            });
          }}
          onViewAllTransactions={() => {
            navigateTo("transactions");
          }}
        />

        <ConfirmDialog
          open={Boolean(isGoalDeleteDialogOpen)}
          title="Delete Goal"
          description="Are you sure you want to delete this goal? This action cannot be undone."
          confirmLabel="Delete"
          confirmColor="error"
          onCancel={closeDialog}
          onConfirm={handleDelete}
        />
      </div>
    </main>
  );
}
