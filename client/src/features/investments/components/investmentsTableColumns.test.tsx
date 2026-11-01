import { renderWithProviders, screen } from "../../../test/test-utils";
import { describe, expect, it, vi } from "vitest";
import { getInvestmentsTableColumns } from "./investmentsTableColumns";

const getReturnCell = () => {
  const column = getInvestmentsTableColumns({
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }).find((column) => column.field === "gainLoss");

  if (!column?.renderCell) throw new Error("Gain / Loss column renderer is missing");
  return column.renderCell;
};

describe("getInvestmentsTableColumns", () => {
  it("shows server-provided return metrics rather than calculating returns from balances", () => {
    const renderCell = getReturnCell();

    renderWithProviders(
      <>{renderCell({
        row: {
          id: "investment-1",
          name: "Index Fund",
          totalInvested: 1000,
          currentValue: 1250,
          gainLossAmount: 175,
          gainLossPercentage: 17.5,
          accountingTreatment: "INVESTMENT",
        },
      } as never)}</>,
    );

    expect(screen.getByText("₹175.00")).toBeInTheDocument();
    expect(screen.getByText("+17.5%")).toBeInTheDocument();
  });

  it("does not calculate returns for protection insurance", () => {
    const renderCell = getReturnCell();

    renderWithProviders(
      <>{renderCell({
        row: {
          id: "investment-2",
          name: "Life Cover",
          totalInvested: 1000,
          currentValue: 1250,
          gainLossAmount: 250,
          gainLossPercentage: 25,
          accountingTreatment: "PROTECTION_EXPENSE",
        },
      } as never)}</>,
    );

    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("Not applicable for protection")).toBeInTheDocument();
    expect(screen.queryByText("+25.0%")).not.toBeInTheDocument();
  });

  it("directs insurance savings users to tracked benefits", () => {
    const renderCell = getReturnCell();

    renderWithProviders(
      <>{renderCell({
        row: {
          id: "investment-3",
          name: "Endowment Policy",
          totalInvested: 1000,
          currentValue: 1250,
          accountingTreatment: "INSURANCE_SAVINGS",
        },
      } as never)}</>,
    );

    expect(screen.getByText("See benefits")).toBeInTheDocument();
    expect(screen.getByText("Benefits tracked separately")).toBeInTheDocument();
  });
});