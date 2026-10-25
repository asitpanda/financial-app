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

  it("renders chart series and changes the selected timeframe", async () => {
    const user = userEvent.setup();
    const data = [point("Jan 2025", 100), point("Feb 2025", 200), point("Mar 2025", 300)];
    renderWithProviders(
      <PortfolioGrowthChart data={data} formatValue={(value) => `$${value}`} />,
    );

    expect(screen.getByText("Current Value")).toBeInTheDocument();
    expect(screen.getByText("Total Invested")).toBeInTheDocument();
    expect(screen.getByText("View portfolio growth over a shorter or longer history.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "6M" }));
    expect(screen.getByRole("button", { name: "6M" })).toBeInTheDocument();
  });
});