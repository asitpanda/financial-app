import { describe, expect, it } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { InvestmentPortfolioGrowthPoint } from "../investments.selectors";
import PortfolioGrowthChart from "./PortfolioGrowthChart";

const point = (label: string, investedToDate: number): InvestmentPortfolioGrowthPoint => ({
  label,
  investedToDate,
  currentValueToDate: investedToDate + 100,
  returnToDate: 100,
  snapshotBackedValue: investedToDate + 100,
  estimatedValue: 0,
  investedOnlyValue: 0,
});

describe("PortfolioGrowthChart", () => {
  it("shows the empty state when no growth points exist", () => {
    renderWithProviders(<PortfolioGrowthChart data={[]} formatValue={(value) => String(value)} />);
    expect(screen.getByText("No portfolio growth data available")).toBeInTheDocument();
  });

  it("shows fiscal-year closing balances and drills into April to March monthly detail", async () => {
    const user = userEvent.setup();
    const data = [point("Mar 2024", 50), point("Apr 2024", 100), point("Jan 2025", 200), point("Mar 2025", 300), point("Apr 2025", 400)];
    renderWithProviders(
      <PortfolioGrowthChart data={data} formatValue={(value) => `$${value}`} />,
    );

    expect(screen.getByText("Current Value")).toBeInTheDocument();
    expect(screen.getByText("Total Invested")).toBeInTheDocument();
    expect(screen.getByText("FY 2023-24")).toBeInTheDocument();
    expect(screen.getByText("FY 2024-25")).toBeInTheDocument();
    expect(screen.getByText("FY 2025-26")).toBeInTheDocument();
    expect(screen.queryByText("Jan")).not.toBeInTheDocument();

    const fiscalYear = screen.getByRole("button", { name: "View monthly breakdown for FY 2024-25" });
    await user.hover(fiscalYear);
    expect(screen.getByText("Invested: $300")).toBeInTheDocument();
    expect(screen.getByText("Current: $400")).toBeInTheDocument();
    await user.click(fiscalYear);
    expect(screen.getByText("Apr")).toBeInTheDocument();
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View monthly breakdown/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to Yearly View" }));
    expect(screen.getByRole("button", { name: "View monthly breakdown for FY 2024-25" })).toBeInTheDocument();
    expect(screen.queryByText("Jan")).not.toBeInTheDocument();
  });

  it("supports keyboard drill-down for a single available month without a dropdown", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioGrowthChart data={[point("Apr 2025", 100)]} formatValue={String} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", { name: "View monthly breakdown for FY 2025-26" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Apr")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to Yearly View" }));
    expect(screen.getByRole("button", { name: "View monthly breakdown for FY 2025-26" })).toBeInTheDocument();
  });
});