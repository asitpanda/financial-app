import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import InvestmentsDashboardView from "./InvestmentsDashboardView";

describe("InvestmentsDashboardView", () => {
  it("shows the empty dashboard state and starts investment setup", async () => {
    const user = userEvent.setup();
    const onCreateInvestment = vi.fn();

    renderWithProviders(
      <InvestmentsDashboardView
        investments={[]}
        portfolioGrowthData={[]}
        timeSeriesData={[]}
        isDrillMode={false}
        onDrillYear={vi.fn()}
        onResetDrill={vi.fn()}
        dashboardKpis={{} as never}
        categoryBreakdown={[]}
        categoryLabelMap={{}}
        valueSourceSummary={{} as never}
        categoryPerformanceRows={[]}
        categorySubBreakdown={[]}
        categoryPerformanceSubRows={[]}
        holdingRows={[]}
        topCurrentValueItems={[]}
        upcomingContributions={[]}
        recentInvestments={[]}
        columns={[]}
        search=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        categoryFilter="all"
        onCategoryFilterChange={vi.fn()}
        categoryOptions={[]}
        onResetFilters={vi.fn()}
        onCreateInvestment={onCreateInvestment}
        onRecordContribution={vi.fn()}
        formatCurrency={(value) => String(value)}
      />,
    );

    expect(screen.getByText("No investments added yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    expect(onCreateInvestment).toHaveBeenCalledTimes(1);
  });
});