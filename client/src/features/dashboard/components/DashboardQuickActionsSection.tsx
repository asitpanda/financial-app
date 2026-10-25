import { SectionCard } from "../../../components/common";
import { ButtonBase } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { CategoryRecord } from "../../categories/categories.types";
import type { GoalRecord } from "../../goals/goal.types";
import type { DashboardPageData } from "../dashboard.types";

interface DashboardQuickActionsSectionProps {
  categories: CategoryRecord[];
  goals: GoalRecord[];
  transactions: DashboardPageData["transactions"];
  investments: DashboardPageData["investments"];
  onAddTransaction: () => void;
  onAddGoal: () => void;
  onAddCategory: () => void;
  onAddInvestment: () => void;
}

export default function DashboardQuickActionsSection({
  onAddTransaction,
  onAddGoal,
  onAddCategory,
  onAddInvestment,
}: DashboardQuickActionsSectionProps) {
  const theme = useTheme();
  const quickActionSx = {
    display: "block",
    width: "100%",
    minHeight: 88,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: `${theme.shape.borderRadius}px`,
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
    textAlign: "left",
    transition: theme.transitions.create(["background-color", "border-color"]),
    "&:hover": {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.selected,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  };

  return (
    <SectionCard
      title="Quick Actions"
      className="xl:col-start-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
    >
      <div className="grid grid-cols-2 gap-3">
        <ButtonBase
          type="button"
          onClick={onAddTransaction}
          className="rounded-lg border px-4 py-4 text-left"
          sx={quickActionSx}
        >
          <div className="text-sm font-semibold">
            Add Transaction
          </div>
          <div className="mt-1 text-xs" style={{ color: theme.palette.text.secondary }}>
            Log new income or expense
          </div>
        </ButtonBase>
        <ButtonBase
          type="button"
          onClick={onAddGoal}
          className="rounded-lg border px-4 py-4 text-left"
          sx={quickActionSx}
        >
          <div className="text-sm font-semibold">Add Goal</div>
          <div className="mt-1 text-xs" style={{ color: theme.palette.text.secondary }}>
            Create a new savings target
          </div>
        </ButtonBase>
        <ButtonBase
          type="button"
          onClick={onAddCategory}
          className="rounded-lg border px-4 py-4 text-left"
          sx={quickActionSx}
        >
          <div className="text-sm font-semibold">
            Add Category
          </div>
          <div className="mt-1 text-xs" style={{ color: theme.palette.text.secondary }}>
            Track a new spending bucket
          </div>
        </ButtonBase>
        <ButtonBase
          type="button"
          onClick={onAddInvestment}
          className="rounded-lg border px-4 py-4 text-left"
          sx={quickActionSx}
        >
          <div className="text-sm font-semibold">
            Add Investments
          </div>
          <div className="mt-1 text-xs" style={{ color: theme.palette.text.secondary }}>
            Manage long-term assets, maturity, and reminders
          </div>
        </ButtonBase>
      </div>
    </SectionCard>
  );
}
