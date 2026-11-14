import { Fragment } from "react";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
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

  it("routes each row action to the matching investment callback", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const investment = { id: "investment-4", name: "Index Fund" } as never;
    const actionColumn = getInvestmentsTableColumns({ onView, onEdit, onDelete })
      .find((column) => column.field === "actions");

    if (!actionColumn?.renderCell) throw new Error("Actions column renderer is missing");

    renderWithProviders(<>{actionColumn.renderCell({ row: investment } as never)}</>);

    await user.click(screen.getByRole("button", { name: "View Index Fund" }));
    await user.click(screen.getByRole("button", { name: "Edit Index Fund" }));
    await user.click(screen.getByRole("button", { name: "Delete Index Fund" }));

    expect(onView).toHaveBeenCalledWith(investment);
    expect(onEdit).toHaveBeenCalledWith(investment);
    expect(onDelete).toHaveBeenCalledWith(investment);
  });

  it("renders investment, valuation, allocation, and recurring details", () => {
    const investment = {
      id: "investment-5",
      name: "Index Fund",
      type: "ETF",
      assetType: "ETF",
      assetCategory: "STOCK",
      institution: "Example Brokerage",
      currency: "INR",
      currentValue: 1250,
      totalInvested: 1000,
      gainLossAmount: 250,
      gainLossPercentage: 25,
      status: "active",
      lastValuationAt: "2026-10-01",
      activeContributionPlan: {
        status: "active",
        amount: 250,
        nextDueDate: "2026-11-15",
      },
    } as never;
    const columns = getInvestmentsTableColumns({
      onView: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      assetTypeConfigs: [{
        code: "ETF",
        label: "Exchange Traded Fund",
        categories: [{ code: "STOCK", label: "Listed Equity" }],
      }],
      formatCurrency: (value) => `INR ${value}`,
      formatDate: (value) => `Date ${value}`,
    });

    renderWithProviders(
      <>{columns.map((column) => (
        <Fragment key={column.field}>
          {column.renderCell?.({ row: investment } as never)}
        </Fragment>
      ))}</>,
    );

    expect(screen.getByText("Index Fund")).toBeInTheDocument();
    expect(screen.getByText("ETF • Example Brokerage")).toBeInTheDocument();
    expect(screen.getByText("INR 1250")).toBeInTheDocument();
    expect(screen.getByText("Invested INR 1000")).toBeInTheDocument();
    expect(screen.getByText("Listed Equity")).toBeInTheDocument();
    expect(screen.getByText("Exchange Traded Fund • INR")).toBeInTheDocument();
    expect(screen.getByText("Valued Date 2026-10-01")).toBeInTheDocument();
    expect(screen.getByText("Date 2026-11-15")).toBeInTheDocument();
    expect(screen.getByText("Amount INR 250")).toBeInTheDocument();
  });

  it("shows pending returns and paused-plan maturity details", () => {
    const columns = getInvestmentsTableColumns({
      onView: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      formatCurrency: (value) => `INR ${value}`,
      formatDate: (value) => `Date ${value}`,
    });
    const investment = {
      id: "investment-6",
      name: "Bond Fund",
      status: "active",
      maturityDate: "2027-01-01",
      activeContributionPlan: { status: "paused", amount: 500 },
    } as never;
    const returnCell = columns.find((column) => column.field === "gainLoss")?.renderCell;
    const activityCell = columns.find((column) => column.field === "upcomingContribution")?.renderCell;

    if (!returnCell || !activityCell) throw new Error("Required investment cells are missing");

    renderWithProviders(
      <>
        {returnCell({ row: investment } as never)}
        {activityCell({ row: investment } as never)}
      </>,
    );

    expect(screen.getByText("Waiting for cost and value")).toBeInTheDocument();
    expect(screen.getByText("Matures Date 2027-01-01")).toBeInTheDocument();
    expect(screen.getByText("Recurring plan paused")).toBeInTheDocument();
  });
});