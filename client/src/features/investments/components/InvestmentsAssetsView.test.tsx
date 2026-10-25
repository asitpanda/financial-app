import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import InvestmentsAssetsView from "./InvestmentsAssetsView";

describe("InvestmentsAssetsView", () => {
  it("shows the first-investment empty state and starts creation", async () => {
    const user = userEvent.setup();
    const onCreateInvestment = vi.fn();

    renderWithProviders(
      <InvestmentsAssetsView
        filteredInvestments={[]}
        columns={[]}
        search=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        categoryFilter="all"
        onCategoryFilterChange={vi.fn()}
        categoryOptions={[{ value: "all", label: "All Categories" }]}
        onResetFilters={vi.fn()}
        onCreateInvestment={onCreateInvestment}
        isFirstInvestmentSetup
      />,
    );

    expect(screen.getByText("No investments added yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    expect(onCreateInvestment).toHaveBeenCalledTimes(1);
  });
});