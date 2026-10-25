import Icon from "@mdi/react";
import { ButtonBase } from "@mui/material";
import { SectionCard } from "../../../components/common";
import { getIconPathByKey } from "../../../constants/categoryIcons";
import type { GoalRecord } from "../../goals/goal.types";
import { useTheme } from "@mui/material/styles";

interface DashboardGoalsOverviewSectionProps {
  goals: GoalRecord[];
  visibleGoals: GoalRecord[];
  activeGoalsCount: number;
  onViewAll: () => void;
  onCreateGoal: () => void;
  onEditGoal: (goal: GoalRecord) => void;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;
const formatDeadline = (value?: string | null) => {
  if (!value) return "No target date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No target date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const GOAL_STYLE_TOKENS = [
  {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    bar: "from-emerald-500 to-emerald-400",
  },
  {
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    bar: "from-violet-500 to-violet-400",
  },
  {
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    bar: "from-amber-500 to-amber-400",
  },
  {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    bar: "from-rose-500 to-rose-400",
  },
  {
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    bar: "from-sky-500 to-sky-400",
  },
];
const DEFAULT_GOAL_ICON = "gift";

const getGoalId = (goal: GoalRecord) => goal?._id || goal?.id;

export default function DashboardGoalsOverviewSection({
  goals,
  visibleGoals,
  activeGoalsCount,
  onViewAll,
  onCreateGoal,
  onEditGoal,
}: DashboardGoalsOverviewSectionProps) {
  const appTheme = useTheme();

  return (
    <SectionCard
      title="Goals Overview"
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-semibold transition"
          style={{ color: appTheme.palette.primary.main }}
        >
          View All
        </button>
      }
      className="h-full xl:col-span-2 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
      empty={goals.length === 0}
      emptyState={{
        title: "No goals yet",
        description:
          "Create your first savings goal to track progress, deadlines, and funding momentum.",
        actionLabel: "Create Goal",
        onAction: onCreateGoal,
      }}
    >
      <div className="space-y-2">
        {visibleGoals.map((goal, index) => {
          const goalId = getGoalId(goal);
          const target = Number(goal.targetAmount || 0);
          const current = Number(goal.currentAmount || 0);
          const progress =
            target > 0
              ? Math.min(100, Math.round((current / target) * 100))
              : 0;
          const theme = GOAL_STYLE_TOKENS[index % GOAL_STYLE_TOKENS.length];
          const iconPath = getIconPathByKey(goal.icon || DEFAULT_GOAL_ICON);

          return (
              <ButtonBase
              key={goalId}
              type="button"
              onClick={() => onEditGoal(goal)}
              aria-label={`Edit ${goal.name || "goal"}`}
                className="w-full px-4 py-3 text-left"
                sx={{
                  display: "block",
                  border: `1px solid ${appTheme.palette.divider}`,
                  borderRadius: `${appTheme.shape.borderRadius}px`,
                  backgroundColor: appTheme.palette.action.hover,
                  color: appTheme.palette.text.primary,
                  textAlign: "left",
                  transition: appTheme.transitions.create(["background-color", "border-color"]),
                  "&:hover": {
                    borderColor: appTheme.palette.primary.main,
                    backgroundColor: appTheme.palette.action.selected,
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${appTheme.palette.primary.main}`,
                    outlineOffset: 2,
                  },
                }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold ${theme.iconBg} ${theme.iconText}`}
                  >
                    {iconPath ? (
                      <Icon path={iconPath} size={0.95} color="currentColor" />
                    ) : (
                      <span>•</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold" style={{ color: appTheme.palette.text.primary }}>
                      {goal.name || "Untitled Goal"}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: appTheme.palette.text.secondary }}>
                      Target: {formatDeadline(goal.deadline)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-1 pl-4">
                  <div className="text-right text-xs font-semibold" style={{ color: appTheme.palette.text.primary }}>
                    {progress}%
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: appTheme.palette.divider }}>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-shrink-0 text-right">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: appTheme.palette.text.primary }}>
                      {formatCurrency(current)}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: appTheme.palette.text.secondary }}>
                      {formatCurrency(target)}
                    </div>
                  </div>
                </div>
              </div>
              </ButtonBase>
          );
        })}

        {goals.length > 0 ? (
          <div
            className="mt-2 flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold"
            style={{
              borderColor: appTheme.palette.divider,
              backgroundColor: appTheme.palette.action.hover,
            }}
          >
            <span className="text-emerald-600">
              {activeGoalsCount} Active Goals
            </span>
            <span style={{ color: appTheme.palette.text.secondary }}>Of {goals.length}</span>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
