import React from "react";
import { SectionCard } from "../../../components/common";
import type { DashboardCategoryPieItem } from "../dashboard.types";

interface DashboardTopCategoriesSectionProps {
  items: DashboardCategoryPieItem[];
  onViewAll: () => void;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function DashboardTopCategoriesSection({
  items,
  onViewAll,
}: DashboardTopCategoriesSectionProps) {
  return (
    <SectionCard
      title="Top Spending Categories"
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
        >
          View All
        </button>
      }
      className="h-full shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
      empty={items.length === 0}
      emptyState={{
        title: "No spending data for this period",
        description:
          "Once expense transactions are recorded, your top spending categories will appear here.",
      }}
    >
      <div className="space-y-5">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-[minmax(0,112px)_minmax(0,1fr)_auto] items-center gap-3"
          >
            <div className="truncate text-sm font-medium text-slate-700">
              {item.name}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(item.percentage * 100, 8)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold text-slate-800">
                {formatCurrency(item.value)}
              </div>
              <div className="text-xs text-slate-400">
                {(item.percentage * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
