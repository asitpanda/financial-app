import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiEyeOutline, mdiPencilOutline } from "@mdi/js";
import {
  Alert,
  Box,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import Button from "../components/common/AppButton";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { getGoals } from "../api/goals";
import { getTransactions } from "../api/transactions";
import { useHeaderAction } from "../hooks/useHeaderAction";
import { useViewportTableHeight } from "../hooks/useViewportTableHeight";
import { matchesPageDateFilter, usePageDateFilterStore } from "../store/pageDateFilterStore";
import GoalFormDrawer from "../components/GoalFormDrawer";
import {
  DataTable,
  EmptyState,
  FilterBar,
  KpiCard,
  SearchBar,
  SectionCard,
  StatusChip,
} from "../components/common";
import { GoalViewDrawer } from "../components/drawers";
import { ConfirmDialog } from "../components/dialogs";
import { useDrawerStore } from "../store/drawerStore";
import { useDialogStore } from "../store/dialogStore";
import { useNotificationStore } from "../store/notificationStore";
import { closeDialog, closeDrawer, navigateTo, openDialog, openDrawer } from "../services/navigation";
import { executeActionContract } from "../utils/actionContract";
import { buildDeleteGoalAction, buildSaveGoalAction } from "../modules/goals/actions";

const getGoalId = (goal) => goal._id || goal.id;

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString()}`;

const getProgress = (goal) => {
  const target = Number(goal.targetAmount || 0);
  const current = Number(goal.currentAmount || 0);
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
};

const getGoalHealth = (goal) => {
  const progress = getProgress(goal);
  const deadline = goal.deadline ? dayjs(goal.deadline) : null;
  const today = dayjs().startOf("day");

  if (progress >= 100) {
    return { label: "Completed", tone: "success" };
  }

  if (deadline) {
    const deadlineDay = deadline.startOf("day");
    if (deadlineDay.isBefore(today)) {
      return { label: "Overdue", tone: "negative" };
    }
    const daysLeft = deadlineDay.diff(today, "day");
    if (daysLeft <= 7) {
      return { label: "Due Soon", tone: "warning" };
    }
  }

  if (progress > 0 && progress < 40) {
    return { label: "At Risk", tone: "warning" };
  }
  if (progress >= 40) {
    return { label: "On Track", tone: "info" };
  }
  return { label: "Not Started", tone: "neutral" };
};

const getGoalProgressBucket = (goal) => {
  const progress = getProgress(goal);
  const health = getGoalHealth(goal);

  if (progress >= 100) return "completed";
  if (health.label === "On Track") return "onTrack";
  if (["At Risk", "Due Soon", "Overdue"].includes(health.label)) return "atRisk";
  return "notStarted";
};

const matchesGoalProgressFilter = (goal, filterKey) => {
  if (filterKey === "all") return true;

  const progress = getProgress(goal);
  const progressBucket = getGoalProgressBucket(goal);

  if (filterKey === "completed") return progress >= 100;
  return progressBucket === filterKey;
};

const getInitialDateFilter = () => ({ dateRange: [null, null], dateRangeShortcut: "all" });

export default function Goals() {
  const goalTableRef = useRef(null);
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState("");
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const drawerOpen = useDrawerStore((state) => state.open);
  const drawerType = useDrawerStore((state) => state.type);
  const drawerMode = useDrawerStore((state) => state.mode);
  const drawerEntityId = useDrawerStore((state) => state.entityId);

  const dialogOpen = useDialogStore((state) => state.open);
  const dialogType = useDialogStore((state) => state.type);
  const dialogPayload = useDialogStore((state) => state.payload);

  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] = useState("all");
  const [tableProgressFilter, setTableProgressFilter] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [dateRangeShortcut, setDateRangeShortcut] = useState("all");

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const periodMode = usePageDateFilterStore((state) => state.mode);
  const selectedYear = usePageDateFilterStore((state) => state.selectedYear);
  const selectedMonth = usePageDateFilterStore((state) => state.selectedMonth);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const gs = await getGoals();
      setGoals(gs);
      setError("");
    } catch (e) {
      setError("Failed to load goals");
      pushNotification({ type: "error", message: "Failed to load goals" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const isGoalViewDrawerOpen = drawerOpen && drawerType === "goal" && drawerMode === "view";

  useEffect(() => {
    if (!isGoalViewDrawerOpen) return undefined;

    let active = true;

    const loadTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const result = await getTransactions();
        if (active) {
          setTransactions(Array.isArray(result) ? result : []);
        }
      } catch (loadTransactionsError) {
        void loadTransactionsError;
        if (active) {
          setTransactions([]);
        }
      } finally {
        if (active) {
          setTransactionsLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      active = false;
    };
  }, [isGoalViewDrawerOpen]);

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
      goalTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleGoalProgressFilterSelect = useCallback((filterKey) => {
    setTableProgressFilter(filterKey);
    focusGoalTable();
  }, [focusGoalTable]);

  const handleGoalTableDrilldown = useCallback((filterKey = "all") => {
    setTableProgressFilter(filterKey);
    focusGoalTable();
  }, [focusGoalTable]);

  const filteredGoals = useMemo(() => {
    const [from, to] = dateRange;

    return goals.filter((goal) => {
      const deadlineDate = goal.deadline ? dayjs(goal.deadline) : null;
      const goalFilterDate = goal.deadline || goal.startDate || goal.createdAt;
      const pageDate = goalFilterDate ? new Date(goalFilterDate) : null;

      if (!matchesGoalProgressFilter(goal, progressFilter)) return false;
      if (pageDate && !matchesPageDateFilter(pageDate, periodMode, selectedYear, selectedMonth)) return false;
      if (!pageDate) return false;

      if (from) {
        if (!deadlineDate || deadlineDate.isBefore(from.startOf("day"))) return false;
      }
      if (to) {
        if (!deadlineDate || deadlineDate.isAfter(to.endOf("day"))) return false;
      }

      const haystack = `${goal.name || ""}`.toLowerCase();
      if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;

      return true;
    });
  }, [goals, search, progressFilter, dateRange, periodMode, selectedYear, selectedMonth]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [search, progressFilter, tableProgressFilter, dateRange]);

  const tableGoals = useMemo(
    () => filteredGoals.filter((goal) => matchesGoalProgressFilter(goal, tableProgressFilter)),
    [filteredGoals, tableProgressFilter]
  );

  const rows = useMemo(
    () =>
      tableGoals.map((goal) => {
        const goalId = getGoalId(goal);
        const target = Number(goal.targetAmount || 0);
        const current = Number(goal.currentAmount || 0);
        const progress = getProgress(goal);

        return {
          id: goalId,
          goal,
          name: goal.name || "Untitled Goal",
          targetAmount: target,
          currentAmount: current,
          progress,
          deadline: goal.deadline ? new Date(goal.deadline) : null,
        };
      }),
    [tableGoals]
  );
  const tableHeight = useViewportTableHeight(goalTableRef, {
    bottomOffset: 50,
    minHeight: 360,
    defaultHeight: 620,
    deps: [loading, error, rows.length],
  });

  const goalInsights = useMemo(() => {
    const source = filteredGoals;
    const totalTarget = source.reduce((sum, goal) => sum + Number(goal.targetAmount || 0), 0);
    const totalSaved = source.reduce((sum, goal) => sum + Number(goal.currentAmount || 0), 0);
    const completed = source.filter((goal) => getGoalProgressBucket(goal) === "completed").length;
    const atRisk = source.filter((goal) => getGoalProgressBucket(goal) === "atRisk").length;
    const onTrack = source.filter((goal) => getGoalProgressBucket(goal) === "onTrack").length;
    const notStarted = source.filter((goal) => getGoalProgressBucket(goal) === "notStarted").length;
    const progressPercent = totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0;

    const upcomingDeadlines = [...source]
      .filter((goal) => goal.deadline)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);

    return {
      totalTarget,
      totalSaved,
      completed,
      atRisk,
      onTrack,
      notStarted,
      progressPercent,
      upcomingDeadlines,
      totalGoals: source.length,
    };
  }, [filteredGoals]);

  const goalProgressChart = useMemo(() => {
    const goalsBySegment = {
      completed: filteredGoals.filter((goal) => getGoalProgressBucket(goal) === "completed"),
      onTrack: filteredGoals.filter((goal) => getGoalProgressBucket(goal) === "onTrack"),
      atRisk: filteredGoals.filter((goal) => getGoalProgressBucket(goal) === "atRisk"),
      notStarted: filteredGoals.filter((goal) => getGoalProgressBucket(goal) === "notStarted"),
    };

    const segments = [
      { key: "completed", label: "Completed", color: "#22c55e" },
      { key: "onTrack", label: "On Track", color: "#3b82f6" },
      { key: "atRisk", label: "At Risk", color: "#f59e0b" },
      { key: "notStarted", label: "Not Started", color: "#8b5cf6" },
    ].map((segment) => ({
      ...segment,
      count: goalsBySegment[segment.key].length,
      totalValue: goalsBySegment[segment.key].reduce(
        (sum, goal) => sum + Number(goal.targetAmount || 0),
        0
      ),
    }));

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return {
      segments: segments.map((segment) => {
        const fraction = goalInsights.totalGoals ? segment.count / goalInsights.totalGoals : 0;
        const dash = fraction * circumference;
        const result = {
          ...segment,
          fraction,
          dash,
          gap: circumference - dash,
          offset,
        };

        offset += dash;
        return result;
      }),
      circumference,
    };
  }, [filteredGoals, goalInsights.totalGoals]);

  const handleSubmitGoal = async (payload) => {
    const action = buildSaveGoalAction({
      payload,
      selectedGoal,
      getGoalId,
      onSuccess: async () => {
        closeDrawer();
        setError("");
        await loadData(true);
      },
    });

    const ok = await executeActionContract(action, { notify: pushNotification });
    if (!ok && action.feedback?.error) {
      setError(action.feedback.error);
    }
  };

  const handleDelete = useCallback(async () => {
    const payload = dialogPayload && typeof dialogPayload === "object" ? dialogPayload : null;
    const targetId = payload && payload.id ? payload.id : null;
    const action = buildDeleteGoalAction({
      targetId,
      onSuccess: async () => {
        closeDialog();
        setError("");
        await loadData(true);
      },
    });

    const ok = await executeActionContract(action, { notify: pushNotification });
    if (!ok && action.feedback?.error) {
      setError(action.feedback.error);
    }
  }, [dialogPayload, loadData, pushNotification]);

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
          <StatusChip label={`${params.value}%`} tone={params.value >= 100 ? "success" : "info"} />
        ),
      },
      {
        field: "deadline",
        headerName: "Deadline",
        flex: 1,
        minWidth: 150,
        valueFormatter: (value) => (value ? new Date(value).toLocaleDateString() : "Not set"),
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
            <Button
              size="small"
              variant="outlined"
              title={`View ${goalName}`}
              aria-label={`View ${goalName}`}
              onClick={() => openViewDrawer(params.row.goal)}
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiEyeOutline} size={0.8} />
            </Button>
            <Button
              size="small"
              variant="contained"
              disableElevation
              title={`Edit ${goalName}`}
              aria-label={`Edit ${goalName}`}
              onClick={() => openEditDrawer(params.row.goal)}
              sx={{ minWidth: 36, width: 36, height: 36, p: 0 }}
            >
              <Icon path={mdiPencilOutline} size={0.8} />
            </Button>
            <Button
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
            </Button>
          </Box>
        );
        },
      },
    ],
    [openEditDrawer, openViewDrawer]
  );

  return (
    <main className="flex-1 w-full">
      <div className="w-full">
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {!loading && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
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

        {!loading && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "1.2fr 1fr" },
              gap: 1.5,
              mb: 2,
            }}
          >
            <SectionCard title="Goal Progress Overview">
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
                  gap: 3,
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Box component="svg" viewBox="0 0 160 160" sx={{ width: 200, height: 200 }} aria-label="Goal progress donut chart">
                    <circle cx="80" cy="80" r="54" fill="none" stroke="#e5e7eb" strokeWidth="18" />
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
                          onClick={() => handleGoalProgressFilterSelect(segment.key)}
                          style={{ cursor: "pointer" }}
                        >
                          <title>{`${segment.label}: ${segment.count} (${(segment.fraction * 100).toFixed(0)}%)`}</title>
                        </circle>
                      ) : null
                    )}
                    <circle cx="80" cy="80" r="33" fill="#ffffff" />
                    <text x="80" y="74" textAnchor="middle" fill="#6b7280" fontSize="10">
                      Goals
                    </text>
                    <text x="80" y="92" textAnchor="middle" fill="#111827" fontSize="18" fontWeight="700">
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
                      onClick={() => handleGoalProgressFilterSelect(segment.key)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {segment.count} goals
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "inline-flex", alignItems: "center", lineHeight: 1 }}
                        >
                          •
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: segment.color }}>
                          {formatCurrency(segment.totalValue)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "inline-flex", alignItems: "center", lineHeight: 1 }}
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

            <SectionCard title="Upcoming Deadlines">
              {goalInsights.upcomingDeadlines.length === 0 ? (
                <EmptyState title="No deadlines" description="Goals with deadlines will appear here." />
              ) : (
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
                        transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <Box>
                        <Box sx={{ fontWeight: 600, fontSize: 13 }}>{goal.name || "Untitled Goal"}</Box>
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
              )}
            </SectionCard>
          </Box>
        )}

        <Box ref={goalTableRef}>
        <SectionCard title="Goal Details Table">
          {!loading && (
            <FilterBar onReset={handleResetFilters}>
              <SearchBar value={search} onChange={setSearch} placeholder="Search goals" />

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

              <Select value={dateRangeShortcut} onChange={(e) => applyDateRangeShortcut(e.target.value)} size="small" fullWidth>
                <MenuItem value="all">Date Range: All Time</MenuItem>
                <MenuItem value="last7">Date Range: Last 7 Days</MenuItem>
                <MenuItem value="last30">Date Range: Last 30 Days</MenuItem>
                <MenuItem value="thisMonth">Date Range: This Month</MenuItem>
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
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
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
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </LocalizationProvider>
            </FilterBar>
          )}

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No goals found"
              description="Adjust your filters or add a new goal to start tracking progress."
              actionLabel="Add Goal"
              onAction={openAddDrawer}
            />
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
                sorting: { sortModel: [{ field: "deadline", sort: "asc" }] },
              }}
            />
          )}
        </SectionCard>
        </Box>

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
            openDrawer({ type: "transaction", mode: "create", entityId: getGoalId(goal), step: "form" });
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
