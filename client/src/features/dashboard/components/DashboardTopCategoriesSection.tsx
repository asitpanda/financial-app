import { SectionCard } from "../../../components/common";
import type { DashboardCategoryPieItem } from "../dashboard.types";
import { useTheme } from "@mui/material/styles";

interface DashboardTopCategoriesSectionProps {
  items: DashboardCategoryPieItem[];
  onViewAll: () => void;
}

import { useCurrencyFormatter } from "../../../utils/currency";

export default function DashboardTopCategoriesSection({
  items,
  onViewAll,
}: DashboardTopCategoriesSectionProps) {
  const theme = useTheme();
  const formatCurrency = useCurrencyFormatter();

  return (
    <SectionCard
      title="Top Spending Categories"
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-semibold transition"
          style={{ color: theme.palette.primary.main }}
        >
          View All
        </button>
      }
      className="h-full"
      sx={{ boxShadow: 1 }}
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
            <div className="truncate text-sm font-medium" style={{ color: theme.palette.text.primary }}>
              {item.name}
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: theme.palette.action.selected }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(item.percentage * 100, 8)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold" style={{ color: theme.palette.text.primary }}>
                {formatCurrency(item.value)}
              </div>
              <div className="text-xs" style={{ color: theme.palette.text.secondary }}>
                {(item.percentage * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
