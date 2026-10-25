import { renderWithProviders, screen } from "../../../test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { getInvestmentsTableColumns } from "./investmentsTableColumns";

const getReturnCell = () =>
  getInvestmentsTableColumns({
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }).find((column) => column.field === "return")?.renderCell;

describe("getInvestmentsTableColumns", () => {
  it("shows investment return metrics for ordinary investments", () => {
    const renderCell = getReturnCell();

    renderWithProviders(
      renderCell?.({
        row: {
          id: "investment-1",
          name: "Index Fund",
          totalInvested: 1000,
          currentValue: 1250,
          accountingTreatment: "INVESTMENT",
        },
      } as never),
    );

    expect(screen.getByText("₹250")).toBeInTheDocument();
    expect(screen.getByText("+25.0% vs invested")).toBeInTheDocument();
  });

  it("does not calculate returns for protection insurance", () => {
    const renderCell = getReturnCell();

    renderWithProviders(
      renderCell?.({
        row: {
          id: "investment-2",
          name: "Life Cover",
          totalInvested: 1000,
          currentValue: 1250,
          accountingTreatment: "PROTECTION_EXPENSE",
        },
      } as never),
    );

    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("Not applicable for protection")).toBeInTheDocument();
    expect(screen.queryByText("+25.0% vs invested")).not.toBeInTheDocument();
  });

  it("directs insurance savings users to tracked benefits", () => {
    const renderCell = getReturnCell();

    renderWithProviders(
      renderCell?.({
        row: {
          id: "investment-3",
          name: "Endowment Policy",
          totalInvested: 1000,
          currentValue: 1250,
          accountingTreatment: "INSURANCE_SAVINGS",
        },
      } as never),
    );

    expect(screen.getByText("See benefits")).toBeInTheDocument();
    expect(screen.getByText("Benefits tracked separately")).toBeInTheDocument();
  });
});