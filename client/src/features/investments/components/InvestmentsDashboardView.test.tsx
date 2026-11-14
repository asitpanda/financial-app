import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import InvestmentsDashboardView from "./InvestmentsDashboardView";

const createDashboardProps = (onCreateInvestment = vi.fn()) => ({
  investments: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false },
  onPageChange: vi.fn(),
  portfolioGrowthData: [],
  timeSeriesData: [],
  isDrillMode: false,
  onDrillYear: vi.fn(),
  onResetDrill: vi.fn(),
  dashboardKpis: {} as never,
  categoryBreakdown: [],
  categoryLabelMap: {},
  valueSourceSummary: {} as never,
  categoryPerformanceRows: [],
  categorySubBreakdown: [],
  categoryPerformanceSubRows: [],
  holdingRows: [],
  topCurrentValueItems: [],
  upcomingContributions: [],
  recentInvestments: [],
  columns: [],
  search: "",
  onSearchChange: vi.fn(),
  statusFilter: "all",
  onStatusFilterChange: vi.fn(),
  categoryFilter: "all",
  onCategoryFilterChange: vi.fn(),
  categoryOptions: [],
  onResetFilters: vi.fn(),
  onCreateInvestment,
  onRecordContribution: vi.fn(),
  onFocusedAssetIdsChange: vi.fn(),
  formatCurrency: (value: number) => String(value),
});

const createPopulatedDashboardProps = () => ({
  ...createDashboardProps(),
  dashboardKpis: {
    totalInvestments: 1,
    totalContributions: 0,
    totalInvested: 0,
    totalCurrentValue: 0,
    totalReturn: 0,
    returnPercentage: 0,
    totalCurrentValueFromInsuranceSavings: 0,
    upcomingMaturity: 0,
    upcomingMaturityFromInsuranceSavings: 0,
    insuranceCover: 0,
    insuranceCoverProtection: 0,
    insuranceCoverSavings: 0,
    insuranceSavingsContribution: 0,
    protectionExpenseTotal: 0,
  } as never,
  valueSourceSummary: {
    snapshotBackedValue: 0,
    estimatedValue: 0,
    investedOnlyValue: 0,
    snapshotBackedCount: 0,
    estimatedCount: 0,
    investedOnlyCount: 0,
    staleValuationCount: 0,
    staleValuationValue: 0,
  } as never,
});

describe("InvestmentsDashboardView", () => {
  it("shows the empty dashboard state and starts investment setup", async () => {
    const user = userEvent.setup();
    const onCreateInvestment = vi.fn();

    renderWithProviders(
      <InvestmentsDashboardView {...createDashboardProps(onCreateInvestment)} />,
    );

    expect(screen.getByText("No investments added yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    expect(onCreateInvestment).toHaveBeenCalledTimes(1);
  });

  it("shows analytics errors instead of stale portfolio widgets", () => {
    renderWithProviders(
      <InvestmentsDashboardView
        {...createDashboardProps()}
        investments={[{ id: "investment-1", name: "Index Fund" } as never]}
        analyticsError="Portfolio analytics are unavailable"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Portfolio analytics are unavailable");
    expect(screen.queryByText("Total Contributions")).not.toBeInTheDocument();
  });

  it("shows the analytics loading state", () => {
    renderWithProviders(
      <InvestmentsDashboardView
        {...createDashboardProps()}
        investments={[{ id: "investment-1", name: "Index Fund" } as never]}
        analyticsLoading
      />,
    );

    expect(screen.getByText("Loading portfolio analytics...")).toBeInTheDocument();
    expect(screen.queryByText("Total Contributions")).not.toBeInTheDocument();
  });

  it.each([
    {
      label: "loading",
      state: { benefitsLoading: true },
      message: "Loading upcoming benefits...",
    },
    {
      label: "error",
      state: { benefitsError: true },
      message: "Failed to load upcoming benefits.",
    },
  ])(
    "shows the upcoming benefits $label state without hiding portfolio widgets",
    ({ state, message }) => {
      renderWithProviders(
        <InvestmentsDashboardView
          {...createPopulatedDashboardProps()}
          investments={[{ id: "investment-1", name: "Index Fund" } as never]}
          {...state}
        />,
      );

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.getByText("Total Contributions")).toBeInTheDocument();
    },
  );

  it("routes an upcoming contribution to the recording workflow", async () => {
    const user = userEvent.setup();
    const onRecordContribution = vi.fn();
    const onFocusedAssetIdsChange = vi.fn();
    const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "scrollIntoView",
    );
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    const plan = {
      id: "plan-1",
      status: "active",
      amount: 250,
      cadenceUnit: "month",
      cadenceInterval: 1,
      nextDueDate: "2026-11-10",
    };
    const investment = {
      id: "investment-1",
      name: "Index Fund",
      status: "active",
      totalInvested: 1000,
      currentValue: 1200,
      startDate: "2025-01-01",
      createdAt: "2026-01-01",
      institution: "Example Brokerage",
      assetType: "ETF",
      assetCategory: "EQUITY",
      currency: "INR",
      activeContributionPlan: plan,
    };
    const contribution = {
      ...investment,
      dueDaysUntil: 0,
      dueLabel: "Due today",
      dueTone: "error",
      treatmentLabel: "Investment",
      treatmentBadgeTone: "primary",
    };

    const DashboardWithFocusState = () => {
      const [focusedAssetIds, setFocusedAssetIds] = useState<
        Array<string | number> | null
      >(null);

      return (
        <InvestmentsDashboardView
          {...createDashboardProps()}
          investments={[investment as never]}
          pagination={{ page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false }}
          dashboardKpis={{
            totalInvestments: 1,
            totalContributions: 1000,
            totalInvested: 1000,
            totalCurrentValue: 1200,
            totalReturn: 200,
            returnPercentage: 20,
            totalCurrentValueFromInsuranceSavings: 0,
            upcomingMaturity: 0,
            upcomingMaturityFromInsuranceSavings: 0,
            insuranceCover: 0,
            insuranceCoverProtection: 0,
            insuranceCoverSavings: 0,
            insuranceSavingsContribution: 0,
            protectionExpenseTotal: 0,
          }}
          valueSourceSummary={{
            snapshotBackedValue: 0,
            estimatedValue: 0,
            investedOnlyValue: 0,
            snapshotBackedCount: 0,
            estimatedCount: 0,
            investedOnlyCount: 0,
            insuranceSavingsWithValueCount: 0,
            insuranceSavingsWithValueValue: 0,
            insuranceSavingsWithoutValueCount: 0,
            staleValuationCount: 0,
            staleValuationValue: 0,
            snapshotBackedIds: [],
            estimatedIds: [],
            investedOnlyIds: [],
            insuranceSavingsWithValueIds: [],
            insuranceSavingsWithoutValueIds: [],
            staleValuationIds: [],
          }}
          upcomingContributions={[contribution as never]}
          onRecordContribution={onRecordContribution}
          focusedAssetIds={focusedAssetIds}
          onFocusedAssetIdsChange={(ids) => {
            onFocusedAssetIdsChange(ids);
            setFocusedAssetIds(ids);
          }}
          columns={[{ field: "name", headerName: "Investment" }]}
        />
      );
    };

    renderWithProviders(<DashboardWithFocusState />);

    await user.click(screen.getByRole("button", { name: "Record" }));

    expect(onRecordContribution).toHaveBeenCalledWith(contribution, plan);

    await user.click(screen.getByText("Due today"));
    expect(onFocusedAssetIdsChange).toHaveBeenCalledWith([investment.id]);
    expect(screen.getByRole("button", { name: "Show All" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show All" }));

    expect(onFocusedAssetIdsChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole("button", { name: "Show All" })).not.toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalled();

    if (scrollIntoViewDescriptor) {
      Object.defineProperty(Element.prototype, "scrollIntoView", scrollIntoViewDescriptor);
    } else {
      Reflect.deleteProperty(Element.prototype, "scrollIntoView");
    }
  });
});