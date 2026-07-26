import dayjs, { type Dayjs } from "dayjs";
import type { PageDateFilterMode } from "../../store/pageDateFilterStore";
import type { GoalProgressFilter, GoalRecord } from "./goal.types";

export interface GoalHealth {
  label: "Completed" | "Overdue" | "Due Soon" | "At Risk" | "On Track" | "Not Started";
  tone: "success" | "negative" | "warning" | "info" | "neutral";
}

export interface GoalInsights {
  totalTarget: number;
  totalSaved: number;
  completed: number;
  atRisk: number;
  onTrack: number;
  notStarted: number;
  progressPercent: number;
  upcomingDeadlines: GoalRecord[];
  totalGoals: number;
}

interface GoalFilterInput {
  search: string;
  progressFilter: GoalProgressFilter;
  dateRange: [Dayjs | null, Dayjs | null];
  periodMode: PageDateFilterMode;
  selectedYear: number;
  selectedMonth: number;
  matchesPageDateFilter: (
    date: Date,
    mode: PageDateFilterMode,
    year: number,
    month: number,
  ) => boolean;
}

const getGoalDeadline = (goal: GoalRecord) =>
  goal.deadline ? dayjs(goal.deadline) : null;

export const getGoalId = (goal: GoalRecord): string =>
  String(goal._id || goal.id || "");

export const formatCurrency = (value: number | string | null | undefined) =>
  `₹${Number(value || 0).toLocaleString()}`;

export const getProgress = (goal: GoalRecord): number => {
  const target = Number(goal.targetAmount || 0);
  const current = Number(goal.currentAmount || 0);
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
};

export const getGoalHealth = (goal: GoalRecord): GoalHealth => {
  const progress = getProgress(goal);
  const deadline = getGoalDeadline(goal);
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

export const getGoalProgressBucket = (
  goal: GoalRecord,
): Exclude<GoalProgressFilter, "all"> => {
  const progress = getProgress(goal);
  const health = getGoalHealth(goal);

  if (progress >= 100) return "completed";
  if (health.label === "On Track") return "onTrack";
  if (["At Risk", "Due Soon", "Overdue"].includes(health.label)) {
    return "atRisk";
  }
  return "notStarted";
};

export const matchesGoalProgressFilter = (
  goal: GoalRecord,
  filterKey: GoalProgressFilter,
): boolean => {
  if (filterKey === "all") return true;

  const progress = getProgress(goal);
  const progressBucket = getGoalProgressBucket(goal);

  if (filterKey === "completed") return progress >= 100;
  return progressBucket === filterKey;
};

export const getFilteredGoals = (
  goals: GoalRecord[],
  {
    search,
    progressFilter,
    dateRange,
    periodMode,
    selectedYear,
    selectedMonth,
    matchesPageDateFilter,
  }: GoalFilterInput,
): GoalRecord[] => {
  const [from, to] = dateRange;

  return goals.filter((goal: GoalRecord) => {
    const deadlineDate = goal.deadline ? dayjs(goal.deadline) : null;
    const goalFilterDate = goal.deadline || goal.startDate || goal.createdAt;
    const pageDate = goalFilterDate ? new Date(goalFilterDate) : null;

    if (!matchesGoalProgressFilter(goal, progressFilter)) return false;

    if (
      pageDate &&
      !matchesPageDateFilter(pageDate, periodMode, selectedYear, selectedMonth)
    ) {
      return false;
    }

    if (!pageDate) return false;

    if (from && (!deadlineDate || deadlineDate.isBefore(from.startOf("day")))) {
      return false;
    }

    if (to && (!deadlineDate || deadlineDate.isAfter(to.endOf("day")))) {
      return false;
    }

    const haystack = `${goal.name || ""}`.toLowerCase();
    if (search.trim() && !haystack.includes(search.trim().toLowerCase())) {
      return false;
    }

    return true;
  });
};

export const getTableGoals = (
  filteredGoals: GoalRecord[],
  tableProgressFilter: GoalProgressFilter,
): GoalRecord[] => {
  return filteredGoals.filter((goal: GoalRecord) =>
    matchesGoalProgressFilter(goal, tableProgressFilter),
  );
};

export const getGoalRows = (tableGoals: GoalRecord[]) => {
  return tableGoals.map((goal: GoalRecord) => {
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
  });
};

export const getGoalInsights = (filteredGoals: GoalRecord[]): GoalInsights => {
  const totalTarget = filteredGoals.reduce(
    (sum, goal) => sum + Number(goal.targetAmount || 0),
    0,
  );
  const totalSaved = filteredGoals.reduce(
    (sum, goal) => sum + Number(goal.currentAmount || 0),
    0,
  );
  const completed = filteredGoals.filter(
    (goal) => getGoalProgressBucket(goal) === "completed",
  ).length;
  const atRisk = filteredGoals.filter(
    (goal) => getGoalProgressBucket(goal) === "atRisk",
  ).length;
  const onTrack = filteredGoals.filter(
    (goal) => getGoalProgressBucket(goal) === "onTrack",
  ).length;
  const notStarted = filteredGoals.filter(
    (goal) => getGoalProgressBucket(goal) === "notStarted",
  ).length;
  const progressPercent = totalTarget
    ? Math.round((totalSaved / totalTarget) * 100)
    : 0;

  const upcomingDeadlines = [...filteredGoals]
    .filter((goal) => goal.deadline)
    .sort(
      (a, b) =>
        new Date(String(a.deadline)).getTime() -
        new Date(String(b.deadline)).getTime(),
    )
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
    totalGoals: filteredGoals.length,
  };
};

export const getGoalProgressChart = (
  filteredGoals: GoalRecord[],
  totalGoals: number,
) => {
  const goalsBySegment = {
    completed: filteredGoals.filter(
      (goal) => getGoalProgressBucket(goal) === "completed",
    ),
    onTrack: filteredGoals.filter(
      (goal) => getGoalProgressBucket(goal) === "onTrack",
    ),
    atRisk: filteredGoals.filter(
      (goal) => getGoalProgressBucket(goal) === "atRisk",
    ),
    notStarted: filteredGoals.filter(
      (goal) => getGoalProgressBucket(goal) === "notStarted",
    ),
  };

  const segments = [
    { key: "completed", label: "Completed", color: "#22c55e" },
    { key: "onTrack", label: "On Track", color: "#3b82f6" },
    { key: "atRisk", label: "At Risk", color: "#f59e0b" },
    { key: "notStarted", label: "Not Started", color: "#8b5cf6" },
  ].map((segment) => ({
    ...segment,
    count: goalsBySegment[segment.key as keyof typeof goalsBySegment].length,
    totalValue: goalsBySegment[
      segment.key as keyof typeof goalsBySegment
    ].reduce((sum, goal) => sum + Number(goal.targetAmount || 0), 0),
  }));

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return {
    segments: segments.map((segment) => {
      const fraction = totalGoals ? segment.count / totalGoals : 0;
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
};
