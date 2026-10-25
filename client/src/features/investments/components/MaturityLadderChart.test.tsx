import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { InvestmentMaturityBucket } from "../investments.selectors";
import MaturityLadderChart from "./MaturityLadderChart";

const data: InvestmentMaturityBucket[] = [
  { label: "0-30 days", amount: 1200, count: 1, investmentIds: ["one"] },
  { label: "31-90 days", amount: 0, count: 0, investmentIds: [] },
];

describe("MaturityLadderChart", () => {
  it("renders formatted amounts and maturity counts", () => {
    renderWithProviders(
      <MaturityLadderChart data={data} formatValue={(value) => `$${value}`} />,
    );

    expect(screen.getByText("0-30 days")).toBeInTheDocument();
    expect(screen.getByText("1 maturity")).toBeInTheDocument();
    expect(screen.getByText("No maturities")).toBeInTheDocument();
    expect(screen.getByText("$1200")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("selects a bucket when a row is clicked", async () => {
    const user = userEvent.setup();
    const onSelectBucket = vi.fn();
    renderWithProviders(
      <MaturityLadderChart
        data={data}
        formatValue={(value) => String(value)}
        selectedLabel="0-30 days"
        onSelectBucket={onSelectBucket}
      />,
    );

    await user.click(screen.getByText("0-30 days"));
    expect(onSelectBucket).toHaveBeenCalledWith(data[0]);
  });
});