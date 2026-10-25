import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import type { InvestmentValueSourceSummary } from "../investments.selectors";
import SourceOfValueCard from "./SourceOfValueCard";

const summary: InvestmentValueSourceSummary = {
  snapshotBackedValue: 700,
  estimatedValue: 200,
  investedOnlyValue: 100,
  snapshotBackedCount: 2,
  estimatedCount: 1,
  investedOnlyCount: 0,
  insuranceSavingsWithValueCount: 0,
  insuranceSavingsWithValueValue: 0,
  insuranceSavingsWithoutValueCount: 0,
  staleValuationCount: 1,
  staleValuationValue: 150,
  snapshotBackedIds: ["snapshot-1", "snapshot-2"],
  estimatedIds: ["estimated-1"],
  investedOnlyIds: [],
  insuranceSavingsWithValueIds: [],
  insuranceSavingsWithoutValueIds: [],
  staleValuationIds: ["stale-1"],
};

describe("SourceOfValueCard", () => {
  it("renders value sources, counts, shares, and stale valuation status", () => {
    renderWithProviders(
      <SourceOfValueCard summary={summary} formatValue={(value) => `$${value}`} />,
    );

    expect(screen.getByText("Snapshot-backed")).toBeInTheDocument();
    expect(screen.getByText("2 holdings")).toBeInTheDocument();
    expect(screen.getByText("1 holding")).toBeInTheDocument();
    expect(screen.getByText("0 holdings")).toBeInTheDocument();
    expect(screen.getByText("70.0% of tracked current value")).toBeInTheDocument();
    expect(screen.getByText(/1 active holdings may need valuation review/)).toBeInTheDocument();
  });

  it("reports selected sources and stale valuations only when clicked", async () => {
    const user = userEvent.setup();
    const onSelectSource = vi.fn();
    const onSelectStaleValuations = vi.fn();
    renderWithProviders(
      <SourceOfValueCard
        summary={summary}
        formatValue={(value) => String(value)}
        onSelectSource={onSelectSource}
        onSelectStaleValuations={onSelectStaleValuations}
      />,
    );

    await user.click(screen.getByText("Snapshot-backed"));
    await user.click(screen.getByText("Valuation freshness"));

    expect(onSelectSource).toHaveBeenCalledWith({
      key: "snapshotBackedIds",
      label: "Snapshot-backed",
      investmentIds: ["snapshot-1", "snapshot-2"],
    });
    expect(onSelectStaleValuations).toHaveBeenCalledWith(["stale-1"]);
  });
});