import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { InvestmentCategoryPerformanceRow } from "../investments.selectors";
import CategoryPerformanceTable from "./CategoryPerformanceTable";

const row = (
  key: string,
  label: string,
  overrides: Partial<InvestmentCategoryPerformanceRow> = {},
): InvestmentCategoryPerformanceRow => ({
  key,
  label,
  holdings: 1,
  invested: 100,
  currentValue: 120,
  returnAmount: 20,
  returnPercentage: 20,
  sparkline: [100, 110, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170],
  investmentIds: [key],
  ...overrides,
});

describe("CategoryPerformanceTable", () => {
  it("drills from asset type to category and back", async () => {
    const user = userEvent.setup();
    const rows = [row("equity", "Equity", { holdings: 2 })];
    const subRows = [
      row("domestic", "Domestic", { assetType: "equity", holdings: 2 }),
      row("debt", "Debt", { assetType: "equity" }),
    ];
    const holdingRows = [
      row("fund-a", "Fund A", { assetType: "equity", assetCategory: "domestic" }),
      row("fund-b", "Fund B", { assetType: "equity", assetCategory: "domestic" }),
    ];

    renderWithProviders(
      <CategoryPerformanceTable
        rows={rows}
        subRows={subRows}
        holdingRows={holdingRows}
        formatValue={(value) => `$${value}`}
      />,
    );

    await user.click(screen.getByText("Equity"));
    expect(screen.getByText("Domestic")).toBeInTheDocument();
    expect(screen.getByText("Debt")).toBeInTheDocument();

    await user.click(screen.getByText("Domestic"));
    expect(screen.getByText("Fund A")).toBeInTheDocument();
    expect(screen.getByText("Fund B")).toBeInTheDocument();
    expect(screen.queryByText("Debt")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("Domestic")).toBeInTheDocument();
  });

  it("shows reported performance and focuses a holding", async () => {
    const user = userEvent.setup();
    const onSelectRow = vi.fn();
    const holding = row("fund-a", "Fund A", { sparkline: [1, 2, 3, 4] });

    renderWithProviders(
      <CategoryPerformanceTable
        rows={[holding]}
        formatValue={(value) => `$${value}`}
        onSelectRow={onSelectRow}
      />,
    );

    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();
    expect(screen.getByText("+$20")).toBeInTheDocument();
    expect(screen.getByText("+20.0%")).toBeInTheDocument();

    await user.click(screen.getByText("Fund A"));
    expect(onSelectRow).toHaveBeenCalledWith(holding);
  });

  it("shows reported losses without deriving returns from invested and current values", () => {
    renderWithProviders(
      <CategoryPerformanceTable
        rows={[row("equity", "Equity", { returnAmount: -7, returnPercentage: -3.2 })]}
        formatValue={(value) => `$${value}`}
      />,
    );

    expect(screen.getByText("$-7")).toBeInTheDocument();
    expect(screen.getByText("-3.2%")).toBeInTheDocument();
  });
});