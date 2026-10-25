import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { InvestmentSeriesPoint } from "../investments.selectors";
import TimeSeriesVisualization from "./TimeSeriesVisualization";

const data: InvestmentSeriesPoint[] = [
  {
    label: "2025",
    invested: 1000,
    return: 100,
    investedBreakdown: { equity: 1000 },
    returnBreakdown: { equity: 100 },
  },
  {
    label: "2026",
    invested: 1500,
    return: -50,
    investedBreakdown: { equity: 1500 },
    returnBreakdown: { equity: -50 },
  },
];

const renderChart = (overrides: Partial<React.ComponentProps<typeof TimeSeriesVisualization>> = {}) =>
  renderWithProviders(
    <TimeSeriesVisualization
      data={data}
      onDrill={vi.fn()}
      onBack={vi.fn()}
      isDrillMode={false}
      formatValue={(value) => `$${value}`}
      categoryLabelMap={{ equity: "Equity" }}
      {...overrides}
    />,
  );

describe("TimeSeriesVisualization", () => {
  it("shows the empty state without series data", () => {
    renderChart({ data: [] });
    expect(screen.getByText("No investment data available")).toBeInTheDocument();
  });

  it("selects the latest point and drills into its breakdown", async () => {
    const user = userEvent.setup();
    const onDrill = vi.fn();
    renderChart({ onDrill });

    expect(screen.getAllByText("2026")).toHaveLength(2);
    expect(screen.getAllByText("Equity")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "View monthly breakdown" }));
    expect(onDrill).toHaveBeenCalledWith("2026");
  });

  it("renders the back control in drill mode", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderChart({ isDrillMode: true, onBack });

    await user.click(screen.getByRole("button", { name: "← Back to Yearly View" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "View monthly breakdown" })).not.toBeInTheDocument();
  });
});