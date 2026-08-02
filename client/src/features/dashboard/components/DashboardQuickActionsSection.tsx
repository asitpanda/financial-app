import React from "react";
import { SectionCard } from "../../../components/common";
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
  categories,
  goals,
  transactions,
  investments,
  onAddTransaction,
  onAddGoal,
  onAddCategory,
  onAddInvestment,
}: DashboardQuickActionsSectionProps) {
  return (
    <SectionCard
      title="Quick Actions"
      className="xl:col-start-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
    >
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onAddTransaction}
          className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
        >
          <div className="text-sm font-semibold text-slate-900">
            Add Transaction
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Log new income or expense
          </div>
        </button>
        <button
          type="button"
          onClick={onAddGoal}
          className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
        >
          <div className="text-sm font-semibold text-slate-900">Add Goal</div>
          <div className="mt-1 text-xs text-slate-500">
            Create a new savings target
          </div>
        </button>
        <button
          type="button"
          onClick={onAddCategory}
          className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
        >
          <div className="text-sm font-semibold text-slate-900">
            Add Category
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Track a new spending bucket
          </div>
        </button>
        <button
          type="button"
          onClick={onAddInvestment}
          className="rounded-[20px] border border-slate-200 px-4 py-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60"
        >
          <div className="text-sm font-semibold text-slate-900">
            Add Investments
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Manage long-term assets, maturity, and reminders
          </div>
        </button>
      </div>
    </SectionCard>
  );
}
