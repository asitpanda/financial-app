import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { InvestmentAllocationSegment } from "../investments.selectors";
import AllocationDonutChart from "./AllocationDonutChart";

const allocation = (
  key: string,
  label: string,
  value: number,
  extra: Pick<InvestmentAllocationSegment, "assetType" | "assetCategory"> = {},
): InvestmentAllocationSegment => ({
  key,
  label,
  value,
  investmentIds: [key],
  ...extra,
});

const rootData = [
  allocation("equity", "Equity", 60),
  allocation("fixed-income", "Fixed Income", 40),
];

const subData = [
  allocation("domestic", "Domestic", 40, { assetType: "equity" }),
  allocation("international", "International", 20, { assetType: "equity" }),
];

const holdingData = [
  allocation("acme", "Acme", 25, {
    assetType: "equity",
    assetCategory: "domestic",
  }),
  allocation("globex", "Globex", 15, {
    assetType: "equity",
    assetCategory: "domestic",
  }),
];

describe("AllocationDonutChart", () => {
  it("renders allocation labels, percentages, and formatted values", () => {
    renderWithProviders(
      <AllocationDonutChart
        data={rootData}
        total={100}
        formatValue={(value) => `$${value}`}
      />,
    );

    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("Fixed Income")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("$60")).toBeInTheDocument();
    expect(screen.getByText("$40")).toBeInTheDocument();
  });

  it("switches to current value data and reports the selected mode", async () => {
    const user = userEvent.setup();
    const onSelectSegment = vi.fn();
    renderWithProviders(
      <AllocationDonutChart
        data={rootData}
        total={100}
        currentValueData={[
          allocation("equity", "Equity", 75),
          allocation("fixed-income", "Fixed Income", 25),
        ]}
        formatValue={(value) => `$${value}`}
        onSelectSegment={onSelectSegment}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Current Value" }));
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("$75")).toBeInTheDocument();

    await user.click(screen.getByText("Fixed Income"));
    expect(onSelectSegment).toHaveBeenCalledWith(
      expect.objectContaining({ key: "fixed-income", value: 25 }),
      "currentValue",
    );
  });

  it("drills into asset types and categories, then navigates back", async () => {
    const user = userEvent.setup();
    const onSelectSegment = vi.fn();
    renderWithProviders(
      <AllocationDonutChart
        data={rootData}
        total={100}
        formatValue={(value) => `$${value}`}
        subData={subData}
        holdingData={holdingData}
        onSelectSegment={onSelectSegment}
      />,
    );

    await user.click(screen.getByText("Equity"));
    expect(screen.getByText("Equity categories — click a segment to focus matching assets.")).toBeInTheDocument();
    expect(screen.getByText("Domestic")).toBeInTheDocument();
    expect(screen.getByText("International")).toBeInTheDocument();

    await user.click(screen.getByText("Domestic"));
    expect(screen.getByText("Equity › Domestic holdings — click a segment to focus that investment.")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();

    await user.click(screen.getByText("Acme"));
    expect(onSelectSegment).toHaveBeenCalledWith(
      expect.objectContaining({ key: "acme", assetCategory: "domestic" }),
      "contribution",
    );

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Domestic")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Fixed Income")).toBeInTheDocument();
  });

  it("shows the hovered segment in the donut center", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(
      <AllocationDonutChart
        data={rootData}
        total={100}
        formatValue={(value) => `$${value}`}
      />,
    );

    const firstSegment = container.querySelector("svg path");
    expect(firstSegment).not.toBeNull();
    await user.hover(firstSegment!);

    const centerText = Array.from(container.querySelectorAll("svg text")).map(
      (element) => element.textContent,
    );
    expect(centerText).toContain("Equity");
    expect(centerText).toContain("60.0%");
    expect(centerText).toContain("$60");
  });
});
