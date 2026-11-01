import Icon from "@mdi/react";
import { ButtonBase } from "@mui/material";
import { SectionCard } from "../../../components/common";
import { getIconPathByKey } from "../../../constants/categoryIcons";
import type { GoalRecord } from "../../goals/goal.types";
import { alpha, useTheme } from "@mui/material/styles";
import { useCurrencyFormatter } from "../../../utils/currency";
import { useDateFormatter } from "../../../utils/date";

interface DashboardGoalsOverviewSectionProps {
  goals: GoalRecord[];
  visibleGoals: GoalRecord[];
  activeGoalsCount: number;
  onViewAll: () => void;
  onCreateGoal: () => void;
  onEditGoal: (goal: GoalRecord) => void;
}

const GOAL_COLOR_KEYS = ["success", "secondary", "warning", "error", "info"] as const;
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
  const formatCurrency = useCurrencyFormatter();
  const formatDeadline = useDateFormatter("No target date");

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
      className="h-full xl:col-span-2"
      sx={{ boxShadow: 1 }}
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
          const goalColor = appTheme.palette[GOAL_COLOR_KEYS[index % GOAL_COLOR_KEYS.length]].main;
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
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold"
                    style={{ backgroundColor: alpha(goalColor, 0.12), color: goalColor }}
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
                      className="h-full rounded-full"
                      style={{ width: `${progress}%`, backgroundColor: goalColor }}
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
            <span style={{ color: appTheme.palette.success.main }}>
              {activeGoalsCount} Active Goals
            </span>
            <span style={{ color: appTheme.palette.text.secondary }}>Of {goals.length}</span>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
