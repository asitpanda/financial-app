import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "../../../test/test-utils";
import { InvestmentViewDrawer } from "./InvestmentViewDrawer";

const mocks = vi.hoisted(() => ({
  updateInvestment: vi.fn(),
  updateContributionPlan: vi.fn(),
  deleteInvestmentEvent: vi.fn(),
  deleteInvestmentSnapshot: vi.fn(),
  deleteInvestmentBenefit: vi.fn(),
  pushNotification: vi.fn(),
  benefits: [] as unknown[],
  benefitsLoading: false,
  benefitsError: null as Error | null,
  refetchBenefits: vi.fn(),
}));

vi.mock("../hooks/useInvestments", () => ({
  useUpdateInvestment: () => ({ mutateAsync: mocks.updateInvestment }),
}));

vi.mock("../hooks/useContributionPlans", () => ({
  useUpdateInvestmentContributionPlan: () => ({
    mutateAsync: mocks.updateContributionPlan,
  }),
  useDeleteInvestmentEvent: () => ({ mutateAsync: mocks.deleteInvestmentEvent }),
  useRecordInvestmentContribution: () => ({ mutateAsync: vi.fn() }),
  useRecordInvestmentWithdrawal: () => ({ mutateAsync: vi.fn() }),
  useRecordInvestmentIncomeCredit: () => ({ mutateAsync: vi.fn() }),
  useUpdateInvestmentEvent: () => ({ mutateAsync: vi.fn() }),
  useSkipCurrentInvestmentContribution: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../hooks/useInvestmentSnapshots", () => ({
  useSaveInvestmentSnapshot: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteInvestmentSnapshot: () => ({ mutateAsync: mocks.deleteInvestmentSnapshot }),
}));

vi.mock("../hooks/useInvestmentBenefits", () => ({
  useInvestmentBenefitsByInvestment: () => ({
    data: mocks.benefits,
    isLoading: mocks.benefitsLoading,
    error: mocks.benefitsError,
    refetch: mocks.refetchBenefits,
  }),
  useDeleteInvestmentBenefit: () => ({ mutateAsync: mocks.deleteInvestmentBenefit }),
  useRealizeInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
  useCreateInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
  useUpdateInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
  useQuickRealizeInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../../../store/notificationStore", () => ({
  useNotificationStore: (
    selector?: (state: { pushNotification: typeof mocks.pushNotification }) => unknown,
  ) => {
    const state = { pushNotification: mocks.pushNotification };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../../../components/common/DataTable", async () => {
  const React = await import("react");
  return {
    default: ({ rows, columns }: {
      rows: Array<{ id: string; [field: string]: unknown }>;
      columns: Array<{
        field: string;
        renderCell?: (params: {
          row: { id: string; [field: string]: unknown };
          value?: unknown;
        }) => React.ReactNode;
      }>;
    }) => {
      return React.createElement(
        "div",
        null,
        rows.map((row) =>
          React.createElement(
            "div",
            { key: row.id },
            columns.map((column) => {
              const value = row[column.field];
              const content =
                column.renderCell?.({ row, value }) ??
                (typeof value === "string" ? value : null);
              return React.createElement("span", { key: column.field }, content);
            }),
          ),
        ),
      );
    },
  };
});

describe("InvestmentViewDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateInvestment.mockResolvedValue(undefined);
    mocks.updateContributionPlan.mockResolvedValue(undefined);
    mocks.deleteInvestmentEvent.mockResolvedValue(undefined);
    mocks.deleteInvestmentSnapshot.mockResolvedValue(undefined);
    mocks.deleteInvestmentBenefit.mockResolvedValue(undefined);
    mocks.benefits = [];
    mocks.benefitsLoading = false;
    mocks.benefitsError = null;
  });

  it("offers a close action when the investment no longer exists", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={onClose}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={null}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    expect(screen.getByText("Investment not found")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("passes the active investment to the edit workflow", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const investment = {
      id: "investment-1",
      name: "Index Fund",
      status: "active",
      totalInvested: 1000,
      currentValue: 1250,
      currency: "INR",
      assetType: "ETF",
      assetCategory: "Equity",
      investmentEvents: [],
      valuationSnapshots: [],
      performanceHistory: [],
      benefits: [],
    } as never;

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={onEdit}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={investment}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Investment" }));

    expect(onEdit).toHaveBeenCalledWith(investment);
  });

  it("switches between the investment detail tabs", async () => {
    const user = userEvent.setup();
    const investment = {
      id: "investment-1",
      name: "Index Fund",
      status: "active",
      totalInvested: 1000,
      currentValue: 1250,
      currency: "INR",
      investmentEvents: [],
      valuationSnapshots: [],
      performanceHistory: [],
      benefits: [],
    } as never;

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={investment}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    for (const tabName of ["Contribution", "Valuation", "Benefits", "Details"]) {
      const tab = screen.getByRole("tab", { name: tabName });
      await user.click(tab);
      expect(tab).toHaveAttribute("aria-selected", "true");
    }
  });

  it("retries history after the overview reports a load error", async () => {
    const user = userEvent.setup();
    const onRetryHistory = vi.fn();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={onRetryHistory}
        eventsError={new Error("History unavailable") as never}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          totalInvested: 1000,
          currentValue: 1250,
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load investment history.");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetryHistory).toHaveBeenCalledOnce();
  });

  it("starts benefit recording from the empty benefits tab", async () => {
    const user = userEvent.setup();
    const onRecordActivity = vi.fn();
    const investment = {
      id: "investment-1",
      name: "Index Fund",
      status: "active",
      totalInvested: 1000,
      currentValue: 1250,
      investmentEvents: [],
      valuationSnapshots: [],
      performanceHistory: [],
      benefits: [],
    } as never;

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={onRecordActivity}
        onRetryHistory={vi.fn()}
        investment={investment}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Benefits" }));
    expect(screen.getByText("No benefits recorded")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Benefit" }));

    expect(onRecordActivity).toHaveBeenCalledWith(investment, null, "benefit");
  });

  it("updates a recurring plan status only after confirmation", async () => {
    const user = userEvent.setup();
    const investment = {
      id: "investment-1",
      name: "Index Fund",
      status: "active",
      contributionMode: "RECURRING",
      activeContributionPlan: {
        id: "plan-1",
        status: "active",
        amount: 100,
        cadenceUnit: "month",
        cadenceInterval: 1,
      },
      investmentEvents: [],
      valuationSnapshots: [],
      performanceHistory: [],
      benefits: [],
    } as never;

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={investment}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Contribution" }));
    await user.click(screen.getByRole("combobox", { name: "Recurring Plan Status" }));
    await user.click(screen.getByRole("option", { name: "Paused" }));

    expect(mocks.updateContributionPlan).not.toHaveBeenCalled();
    expect(screen.getByText(/change the recurring contribution plan status to "Paused"/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Update Status" }));

    expect(mocks.updateContributionPlan).toHaveBeenCalledWith({
      investmentId: "investment-1",
      planId: "plan-1",
      payload: { status: "paused" },
    });
    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Recurring plan status updated to Paused",
    });
  });

  it("shows a recoverable error when a recurring plan status update fails", async () => {
    const user = userEvent.setup();
    mocks.updateContributionPlan.mockRejectedValue(new Error("Plan update failed"));

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          contributionMode: "RECURRING",
          activeContributionPlan: {
            id: "plan-1",
            status: "active",
            amount: 100,
            cadenceUnit: "month",
            cadenceInterval: 1,
          },
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Contribution" }));
    await user.click(screen.getByRole("combobox", { name: "Recurring Plan Status" }));
    await user.click(screen.getByRole("option", { name: "Paused" }));
    await user.click(screen.getByRole("button", { name: "Update Status" }));

    expect(await screen.findByText("Plan update failed")).toBeInTheDocument();
    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "error",
      message: "Plan update failed",
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Confirm Plan Status Change" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("combobox", { name: "Recurring Plan Status" })).toHaveTextContent("Active");
  });

  it("allows editing eligible activity but withholds actions for benefit-linked activity", async () => {
    const user = userEvent.setup();
    const onEditActivity = vi.fn();
    const editableEvent = {
      id: "event-editable",
      eventType: "CONTRIBUTION",
      eventDate: "2026-01-10",
      amount: 100,
    };
    const linkedBenefitEvent = {
      id: "event-benefit-linked",
      eventType: "CONTRIBUTION",
      eventDate: "2026-01-11",
      amount: 200,
      linkedBenefitId: "benefit-1",
    };

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={onEditActivity}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [editableEvent, linkedBenefitEvent],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Contribution" }));

    const editButtons = screen.getAllByRole("button", { name: /Edit activity on/ });
    expect(editButtons).toHaveLength(1);
    await user.click(editButtons[0]);

    expect(onEditActivity).toHaveBeenCalledWith(expect.objectContaining({ id: "investment-1" }), editableEvent);
  });

  it("deletes an activity only after confirmation and preserves it when canceled", async () => {
    const user = userEvent.setup();
    const event = {
      id: "event-1",
      eventType: "CONTRIBUTION",
      eventDate: "2026-01-10",
      amount: 100,
    };

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [event],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Contribution" }));
    await user.click(await screen.findByRole("button", { name: /Delete activity on/ }));
    expect(mocks.deleteInvestmentEvent).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.deleteInvestmentEvent).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /Delete activity on/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.deleteInvestmentEvent).toHaveBeenCalledWith({
      investmentId: "investment-1",
      eventId: "event-1",
    });
    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: expect.stringMatching(/^Deleted contribution from/),
    });
  });

  it("updates the investment status after confirmation", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Investment Status" }));
    await user.click(screen.getByRole("option", { name: "Matured" }));
    expect(mocks.updateInvestment).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Update Status" }));

    expect(mocks.updateInvestment).toHaveBeenCalledWith({
      id: "investment-1",
      data: { status: "matured" },
    });
    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Investment status updated to Matured. Attached contribution plan paused.",
    });
  });

  it("opens the investment closure workflow instead of closing directly", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Investment Status" }));
    await user.click(screen.getByRole("option", { name: "Closed" }));

    expect(screen.getByText("Close Investment")).toBeInTheDocument();
    expect(mocks.updateInvestment).not.toHaveBeenCalled();
  });

  it("deletes a valuation only after confirmation", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          currentValue: 1250,
          totalInvested: 1000,
          investmentEvents: [],
          valuationSnapshots: [{
            id: "snapshot-1",
            snapshotDate: "2026-01-10",
            marketValue: 1250,
            units: 10,
            price: 125,
            source: "MANUAL",
          }],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Valuation" }));
    await user.click(await screen.findByRole("button", { name: /Delete valuation on/ }));
    expect(mocks.deleteInvestmentSnapshot).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.deleteInvestmentSnapshot).toHaveBeenCalledWith({
      snapshotId: "snapshot-1",
      investmentId: "investment-1",
    });
    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: expect.stringMatching(/^Deleted valuation for/),
    });
  });

  it("shows performance details when a chart point is hovered", async () => {
    const user = userEvent.setup();
    const { baseElement } = renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          totalInvested: 1000,
          currentValue: 1250,
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [
            { date: "2025-11-01", currentValue: 900, investedValue: 1000, gainLossValue: -100, gainLossPercentage: -10 },
            { date: "2025-12-01", currentValue: 1100, investedValue: 1000, gainLossValue: 100, gainLossPercentage: 10 },
            { date: "2026-01-01", currentValue: 1250, investedValue: 1000, gainLossValue: 250, gainLossPercentage: 25 },
          ],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Valuation" }));
    for (const period of ["3M", "6M", "1Y"]) {
      await user.click(screen.getByRole("button", { name: period }));
    }
    const chartPoint = baseElement.querySelector("circle");
    expect(chartPoint).not.toBeNull();
    await user.hover(chartPoint!);

    expect(screen.getByText("Current Value", { selector: "text" })).toBeInTheDocument();
    expect(screen.getByText("Total Invested", { selector: "text" })).toBeInTheDocument();
    expect(screen.getByText("Return", { selector: "text" })).toBeInTheDocument();
    await user.unhover(chartPoint!);
    expect(screen.queryByText("Return", { selector: "text" })).not.toBeInTheDocument();
    await user.hover(baseElement.querySelectorAll("circle")[4]);
    expect(screen.getByText("Return", { selector: "text" })).toBeInTheDocument();
  });

  it("retries when investment benefits fail to load", async () => {
    const user = userEvent.setup();
    mocks.benefitsError = new Error("Benefits unavailable");

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Benefits" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load investment benefits.");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(mocks.refetchBenefits).toHaveBeenCalledOnce();
  });

  it("shows expected benefits and opens realization for the selected benefit", async () => {
    const user = userEvent.setup();
    mocks.benefits = [{
      id: "benefit-1",
      benefitType: "MATURITY",
      amount: 1500,
      benefitDate: "2026-12-01",
      status: "EXPECTED",
      destinationAccountId: "account-1",
      notes: "Maturity payout",
      realizedEvents: [{
        id: "realized-1",
        eventType: "INTEREST_CREDIT",
        amount: 50,
        eventDate: "2026-06-01",
      }],
    }];

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          accountId: "account-1",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[{
          id: "account-1",
          displayName: "Savings Account",
          institutionName: "Example Bank",
          accountNumberMasked: "****1234",
        } as never]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Benefits" }));

    expect(screen.getByText("Maturity")).toBeInTheDocument();
    expect(screen.getByText("Maturity payout")).toBeInTheDocument();
    expect(screen.getByText("Interest Credit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Realize" }));

    expect(screen.getByText("Realize Investment Benefit")).toBeInTheDocument();
  });

  it("filters activity by type, status, and source", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [
            {
              id: "event-contribution",
              eventType: "CONTRIBUTION",
              eventDate: "2026-01-01",
              amount: 100,
              status: "recorded",
              recurringPlanId: "plan-1",
              notes: "recurring-contribution",
            },
            {
              id: "event-withdrawal",
              eventType: "WITHDRAWAL_PRINCIPAL",
              eventDate: "2026-01-02",
              amount: 25,
              status: "confirmed",
              eventSource: "manual",
              notes: "confirmed-withdrawal",
            },
            {
              id: "event-fee",
              eventType: "FEE",
              eventDate: "2026-01-03",
              amount: 5,
              status: "skipped",
              eventSource: "system",
              notes: "system-fee",
            },
          ],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Contribution" }));
    await user.click(screen.getByRole("button", { name: "Withdrawals (1)" }));
    expect(screen.getByText("confirmed-withdrawal")).toBeInTheDocument();
    expect(screen.queryByText("recurring-contribution")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All (3)" }));
    const filters = screen.getAllByRole("combobox");
    await user.click(filters[0]);
    await user.click(screen.getByRole("option", { name: "Confirmed" }));
    expect(screen.getByText("confirmed-withdrawal")).toBeInTheDocument();
    expect(screen.queryByText("recurring-contribution")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "Recurring Plan" }));
    expect(screen.getByText("No contributions match the current filters.")).toBeInTheDocument();
  });

  it("opens and closes create and edit valuation forms", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          currentValue: 1250,
          totalInvested: 1000,
          investmentEvents: [],
          valuationSnapshots: [{
            id: "snapshot-1",
            snapshotDate: "2026-01-10",
            marketValue: 1250,
            units: 10,
            price: 125,
            source: "MANUAL",
          }],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Valuation" }));
    await user.click(screen.getByRole("button", { name: "Record Valuation" }));
    expect(screen.getByRole("heading", { name: "Record Valuation" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(await screen.findByRole("button", { name: /Edit valuation on/ }));
    expect(screen.getByRole("heading", { name: "Edit Valuation" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("keeps the valuation confirmation open and reports an error when deletion fails", async () => {
    const user = userEvent.setup();
    mocks.deleteInvestmentSnapshot.mockRejectedValue(new Error("Valuation delete failed"));

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [{
            id: "snapshot-1",
            snapshotDate: "2026-01-10",
            marketValue: 1250,
          }],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Valuation" }));
    await user.click(await screen.findByRole("button", { name: /Delete valuation on/ }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "error",
      message: "Valuation delete failed",
    });
    expect(screen.getByRole("dialog", { name: "Delete valuation" })).toBeInTheDocument();
  });

  it("reports an error when the investment status update fails", async () => {
    const user = userEvent.setup();
    mocks.updateInvestment.mockRejectedValue(new Error("Status update failed"));

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Investment Status" }));
    await user.click(screen.getByRole("option", { name: "Matured" }));
    await user.click(screen.getByRole("button", { name: "Update Status" }));

    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "error",
      message: "Status update failed",
    });
  });

  it("shows a loading state while investment benefits are being fetched", async () => {
    const user = userEvent.setup();
    mocks.benefitsLoading = true;

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Benefits" }));

    expect(screen.getByText("Loading benefits...")).toBeInTheDocument();
  });

  it("allows editing expected benefits and adding a benefit from a populated list", async () => {
    const user = userEvent.setup();
    const expectedBenefit = {
      id: "benefit-expected",
      benefitType: "MATURITY",
      amount: 1500,
      benefitDate: "2026-12-01",
      status: "EXPECTED",
      notes: "Expected maturity payout",
    };
    const onEditActivity = vi.fn();
    const onRecordActivity = vi.fn();
    mocks.benefits = [
      expectedBenefit,
      {
        id: "benefit-received",
        benefitType: "INTEREST",
        amount: 50,
        benefitDate: "2026-06-01",
        status: "RECEIVED",
      },
      {
        id: "benefit-cancelled",
        benefitType: "SURRENDER",
        amount: 0,
        benefitDate: "2026-07-01",
        status: "CANCELLED",
      },
    ];

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={onEditActivity}
        onRecordActivity={onRecordActivity}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Benefits" }));
    expect(screen.getAllByText("Received", { exact: true })).toHaveLength(2);
    expect(screen.getAllByText("Cancelled", { exact: true })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Edit Maturity benefit" }));
    expect(onEditActivity).toHaveBeenCalledWith(
      expect.objectContaining({ id: "investment-1" }),
      expectedBenefit,
      "benefit",
    );
    await user.click(screen.getByRole("button", { name: "Add Benefit" }));
    expect(onRecordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ id: "investment-1" }),
      null,
      "benefit",
    );
  });

  it("deletes an expected benefit only after confirmation", async () => {
    const user = userEvent.setup();
    mocks.benefits = [{
      id: "benefit-1",
      benefitType: "MATURITY",
      amount: 1500,
      benefitDate: "2026-12-01",
      status: "EXPECTED",
    }];

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Benefits" }));
    await user.click(screen.getByRole("button", { name: "Delete Maturity benefit" }));
    expect(mocks.deleteInvestmentBenefit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.deleteInvestmentBenefit).not.toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: "Delete Maturity benefit" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.deleteInvestmentBenefit).toHaveBeenCalledWith({
      investmentId: "investment-1",
      benefitId: "benefit-1",
    });
    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Benefit deleted successfully",
    });
  });

  it("reports a recoverable error when benefit deletion fails", async () => {
    const user = userEvent.setup();
    mocks.deleteInvestmentBenefit.mockRejectedValue(new Error("Benefit delete failed"));
    mocks.benefits = [{
      id: "benefit-1",
      benefitType: "MATURITY",
      amount: 1500,
      benefitDate: "2026-12-01",
      status: "EXPECTED",
    }];

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: [],
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Benefits" }));
    await user.click(screen.getByRole("button", { name: "Delete Maturity benefit" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.pushNotification).toHaveBeenCalledWith({
      type: "error",
      message: "Benefit delete failed",
    });
    expect(screen.getByRole("dialog", { name: "Delete benefit" })).toBeInTheDocument();
  });

  it("hides mutation actions for a closed investment", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Closed Deposit",
          status: "closed",
          totalInvested: 1000,
          currentValue: 1100,
          realizedProfitLoss: 100,
          realizedProfitLossPercentage: 10,
          investmentEvents: [{
            id: "event-1",
            eventType: "CONTRIBUTION",
            eventDate: "2026-01-01",
            amount: 1000,
          }],
          valuationSnapshots: [{
            id: "snapshot-1",
            snapshotDate: "2026-01-10",
            marketValue: 1100,
          }],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Edit Investment" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Valuation" }));
    expect(screen.queryByRole("button", { name: "Record Valuation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit valuation on/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Contribution" }));
    expect(screen.queryByRole("button", { name: /Edit activity on/ })).not.toBeInTheDocument();
    expect(screen.queryByText("+₹100.00")).toBeInTheDocument();
  });

  it("labels supported contribution and withdrawal activity types distinctly", async () => {
    const user = userEvent.setup();
    const eventTypes = [
      ["CONTRIBUTION", "Contribution"],
      ["PREMIUM", "Premium"],
      ["OPENING_BALANCE", "Opening Balance"],
      ["OPENING_INCOME_CREDIT", "Opening Income"],
      ["INCOME_CREDIT", "Income Credit"],
      ["WITHDRAWAL_PRINCIPAL", "Principal Withdrawal"],
      ["FEE", "Fee"],
    ];

    renderWithProviders(
      <InvestmentViewDrawer
        open
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onEditActivity={vi.fn()}
        onRecordActivity={vi.fn()}
        onRetryHistory={vi.fn()}
        investment={{
          id: "investment-1",
          name: "Index Fund",
          status: "active",
          investmentEvents: eventTypes.map(([eventType], index) => ({
            id: `event-${index}`,
            eventType,
            eventDate: `2026-01-${String(index + 1).padStart(2, "0")}`,
            amount: index === 0 ? 0 : 25,
            netAmount: index === 0 ? 25 : undefined,
            dueDate: index === 1 ? "2026-01-15" : undefined,
          })),
          valuationSnapshots: [],
          performanceHistory: [],
          benefits: [],
        } as never}
        accounts={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Contribution" }));
    for (const [, label] of eventTypes) {
      const matchingText = screen.getAllByText(label, { exact: true });
      expect(
        matchingText.some((element) => !element.closest('[role="tab"]')),
      ).toBe(true);
    }
  });
});