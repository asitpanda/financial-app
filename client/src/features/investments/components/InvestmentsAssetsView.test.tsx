import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import InvestmentsAssetsView from "./InvestmentsAssetsView";

const createViewProps = (overrides = {}) => ({
  filteredInvestments: [],
  pagination: { page: 1, limit: 25, total: 0, totalPages: 0, hasNextPage: false },
  onPageChange: vi.fn(),
  columns: [],
  search: "",
  onSearchChange: vi.fn(),
  statusFilter: "all",
  onStatusFilterChange: vi.fn(),
  categoryFilter: "all",
  onCategoryFilterChange: vi.fn(),
  categoryOptions: [
    { value: "all", label: "All Categories" },
    { value: "EQUITY", label: "Equity" },
  ],
  onResetFilters: vi.fn(),
  onCreateInvestment: vi.fn(),
  isFirstInvestmentSetup: false,
  ...overrides,
});

describe("InvestmentsAssetsView", () => {
  it("shows the first-investment empty state and starts creation", async () => {
    const user = userEvent.setup();
    const onCreateInvestment = vi.fn();

    renderWithProviders(
      <InvestmentsAssetsView
        filteredInvestments={[]}
        pagination={{ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false }}
        onPageChange={vi.fn()}
        columns={[]}
        search=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        categoryFilter="all"
        onCategoryFilterChange={vi.fn()}
        categoryOptions={[{ value: "all", label: "All Categories" }]}
        onResetFilters={vi.fn()}
        onCreateInvestment={onCreateInvestment}
        isFirstInvestmentSetup
      />,
    );

    expect(screen.getByText("No investments added yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    expect(onCreateInvestment).toHaveBeenCalledTimes(1);
  });

  it("reports the selected treatment filter", async () => {
    const user = userEvent.setup();
    const onTreatmentFilterChange = vi.fn();

    renderWithProviders(
      <InvestmentsAssetsView
        filteredInvestments={[]}
        pagination={{ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false }}
        onPageChange={vi.fn()}
        columns={[]}
        search=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        categoryFilter="all"
        onCategoryFilterChange={vi.fn()}
        categoryOptions={[{ value: "all", label: "All Categories" }]}
        treatmentFilter="all"
        onTreatmentFilterChange={onTreatmentFilterChange}
        onResetFilters={vi.fn()}
        onCreateInvestment={vi.fn()}
        isFirstInvestmentSetup={false}
      />,
    );

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByRole("option", { name: "Protection Insurance" }));

    expect(onTreatmentFilterChange).toHaveBeenCalledWith("PROTECTION_EXPENSE");
  });

  it("routes search, status, category, and reset actions to their handlers", async () => {
    const user = userEvent.setup();
    const props = createViewProps();
    const ControlledAssetsView = () => {
      const [search, setSearch] = useState("");
      return (
        <InvestmentsAssetsView
          {...props}
          search={search}
          onSearchChange={(value) => {
            props.onSearchChange(value);
            setSearch(value);
          }}
        />
      );
    };

    renderWithProviders(<ControlledAssetsView />);

    await user.type(
      screen.getByPlaceholderText("Search by name, type, institution, or reference"),
      "Bond",
    );
    expect(props.onSearchChange).toHaveBeenLastCalledWith("Bond");

    const filters = screen.getAllByRole("combobox");
    await user.click(filters[0]);
    await user.click(screen.getByRole("option", { name: "Active" }));
    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "Equity" }));
    await user.click(screen.getByRole("button", { name: "Reset Filters" }));

    expect(props.onStatusFilterChange).toHaveBeenCalledWith("active");
    expect(props.onCategoryFilterChange).toHaveBeenCalledWith("EQUITY");
    expect(props.onResetFilters).toHaveBeenCalledTimes(1);
  });

  it("shows a filter-empty state and keeps the add action available", async () => {
    const user = userEvent.setup();
    const onCreateInvestment = vi.fn();

    renderWithProviders(
      <InvestmentsAssetsView
        {...createViewProps({
          search: "Missing asset",
          onCreateInvestment,
          showSummaryCards: false,
        })}
      />,
    );

    expect(screen.getByText("No investments match current filters")).toBeInTheDocument();
    expect(screen.queryByText("Tracked Assets")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Investment" }));

    expect(onCreateInvestment).toHaveBeenCalledTimes(1);
  });

  it("counts tracked, active, maturing, and insured assets in the summary cards", () => {
    const investments = [
      { id: "asset-1", name: "Active insured", status: "active", maturityDate: "2027-01-01", insuranceCover: 100 },
      { id: "asset-2", name: "Active maturing", status: "active", maturityDate: "2027-02-01" },
      { id: "asset-3", name: "Active", status: "active" },
      { id: "asset-4", name: "Closed", status: "closed" },
    ];

    renderWithProviders(
      <InvestmentsAssetsView
        {...createViewProps({
          filteredInvestments: investments as never,
          pagination: { page: 1, limit: 25, total: 4, totalPages: 1, hasNextPage: false },
          columns: [{ field: "name", headerName: "Investment" }],
        })}
      />,
    );

    expect(screen.getByText("Tracked Assets").parentElement?.textContent).toContain("4");
    expect(screen.getByText("Active Assets").parentElement?.textContent).toContain("3");
    expect(screen.getByText("Maturity Tracked").parentElement?.textContent).toContain("2");
    expect(screen.getByText("Insured Assets").parentElement?.textContent).toContain("1");
  });
});