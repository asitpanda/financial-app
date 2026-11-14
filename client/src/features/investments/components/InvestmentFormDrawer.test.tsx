import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import InvestmentFormDrawer from "./InvestmentFormDrawer";

describe("InvestmentFormDrawer", () => {
  it("blocks submission and shows required investment fields", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        accounts={[]}
        assetTypeConfigs={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Account is required")).toBeInTheDocument();
    expect(screen.getByText("Investment name is required")).toBeInTheDocument();
    expect(screen.getByText("Institution is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires a positive investment amount for a new one-time investment", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        accounts={[{ id: 7, name: "Investment Account", currency: "INR" }]}
        assetTypeConfigs={[{
          code: "ETF",
          label: "Exchange Traded Fund",
          categories: [{ code: "EQUITY", label: "Equity" }],
        }]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Funding Account" }));
    await user.click(screen.getByRole("option", { name: "Investment Account" }));
    await user.type(screen.getByLabelText("Investment Name"), "Index Fund");
    await user.type(screen.getByLabelText("Institution"), "Example Brokerage");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Investment amount must be greater than 0")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the existing investment details when saving an edit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        initialValues={{
          id: "investment-1",
          accountId: 7,
          name: "Index Fund",
          assetType: "ETF",
          assetCategory: "Equity",
          type: "ETF",
          category: "Equity",
          institution: "Example Brokerage",
          totalInvested: 2500,
          currentValue: 2750,
          startDate: "2026-01-02",
          status: "active",
          currency: "INR",
        } as never}
        accounts={[{ id: 7, name: "Investment Account", currency: "INR" }]}
        assetTypeConfigs={[]}
        taxonomyNodes={[]}
        title="Edit Investment"
        submitLabel="Save changes"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      accountId: "7",
      name: "Index Fund",
      type: "ETF",
      category: "Equity",
      institution: "Example Brokerage",
      totalInvested: "2500",
      currentValue: "2750",
      status: "active",
      contributionType: "one-time",
      recurringPlan: null,
      expectedBenefits: null,
    }));
  });

  it("shows a recoverable submit error and clears it after a successful retry", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn()
      .mockResolvedValueOnce("Investment could not be saved")
      .mockResolvedValueOnce(undefined);

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        initialValues={{
          id: "investment-1",
          accountId: 7,
          name: "Index Fund",
          assetType: "ETF",
          assetCategory: "Equity",
          type: "ETF",
          category: "Equity",
          institution: "Example Brokerage",
          totalInvested: 2500,
          currentValue: 2750,
          startDate: "2026-01-02",
          status: "active",
          currency: "INR",
        } as never}
        accounts={[{ id: 7, name: "Investment Account", currency: "INR" }]}
        assetTypeConfigs={[]}
        taxonomyNodes={[]}
        submitLabel="Save changes"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Investment could not be saved");

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows policy-specific fields for a protection insurance investment", () => {
    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialValues={{
          id: "policy-1",
          accountId: 7,
          name: "Family Cover",
          assetType: "INSURANCE",
          assetCategory: "PROTECTION",
          type: "INSURANCE",
          category: "PROTECTION",
          institution: "Example Insurer",
          totalInvested: 12000,
          currentValue: 0,
          insuranceCover: 1000000,
          referenceNumber: "POL-123",
          startDate: "2026-01-02",
          status: "active",
        } as never}
        accounts={[]}
        assetTypeConfigs={[{
          code: "INSURANCE",
          label: "Insurance",
          accountingTreatment: "PROTECTION_EXPENSE",
          categories: [{
            code: "PROTECTION",
            label: "Protection",
            accountingTreatment: "PROTECTION_EXPENSE",
          }],
        }]}
        taxonomyNodes={[]}
      />,
    );

    expect(screen.getByText("Policy Number")).toBeInTheDocument();
    expect(screen.getByText("Policy Term End Date (Optional)")).toBeInTheDocument();
    expect(screen.getByText("Insurance Cover")).toBeInTheDocument();
  });

  it("requires a recurring amount before saving a recurring plan", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        initialValues={{
          id: "investment-1",
          accountId: 7,
          name: "Index Fund",
          assetType: "ETF",
          assetCategory: "Equity",
          institution: "Example Brokerage",
          totalInvested: 2500,
          currentValue: 2750,
          startDate: "2026-01-02",
          status: "active",
        } as never}
        accounts={[]}
        assetTypeConfigs={[]}
        taxonomyNodes={[]}
        submitLabel="Save changes"
      />,
    );

    await user.click(screen.getByText("Recurring Contribution"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Recurring amount must be greater than 0")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("locks historical import settings for an existing active recurring plan", () => {
    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialValues={{
          id: "investment-1",
          accountId: 7,
          name: "Index Fund",
          assetType: "ETF",
          assetCategory: "Equity",
          institution: "Example Brokerage",
          totalInvested: 2500,
          currentValue: 2750,
          startDate: "2026-01-02",
          status: "active",
          activeContributionPlan: {
            id: "plan-1",
            status: "active",
            amount: 500,
            cadenceUnit: "month",
            cadenceInterval: 1,
            anchorDate: "2026-01-02",
            historicalImportMode: "OPENING_BALANCE",
            openingPrincipalAmount: 2500,
          },
        } as never}
        accounts={[{ id: 7, name: "Investment Account", currency: "INR" }]}
        assetTypeConfigs={[{
          code: "ETF",
          label: "Exchange Traded Fund",
          categories: [{ code: "Equity", label: "Equity" }],
        }]}
        taxonomyNodes={[]}
        submitLabel="Save changes"
      />,
    );

    expect(screen.getByRole("combobox", { name: "Historical Import Mode" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText(/Historical import is locked when editing an existing investment/)).toHaveLength(2);
    expect(screen.queryByText("Are you already invested in this asset?")).not.toBeInTheDocument();
  });

  it("locks historical setup when converting an existing one-time investment to recurring", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialValues={{
          id: "investment-1",
          accountId: 7,
          name: "Index Fund",
          assetType: "ETF",
          assetCategory: "Equity",
          institution: "Example Brokerage",
          totalInvested: 2500,
          currentValue: 2750,
          startDate: "2026-01-02",
          status: "active",
        } as never}
        accounts={[{ id: 7, name: "Investment Account", currency: "INR" }]}
        assetTypeConfigs={[]}
        taxonomyNodes={[]}
        submitLabel="Save changes"
      />,
    );

    await user.click(screen.getByText("Recurring Contribution"));

    expect(screen.getByText(/Historical import is locked when editing an existing investment/)).toBeInTheDocument();
    expect(screen.queryByText("Are you already invested in this asset?")).not.toBeInTheDocument();
    expect(screen.queryByText("Yes, I already have past investment")).not.toBeInTheDocument();
    expect(screen.queryByText("No, I am starting now")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Historical Import Mode" })).not.toBeInTheDocument();
    expect(screen.getByText(/History import is off/)).toBeInTheDocument();
  });

  it("keeps historical setup choices available when creating a new recurring investment", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        accounts={[]}
        assetTypeConfigs={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByText("Recurring Contribution"));

    expect(screen.getByText("Are you already invested in this asset?")).toBeInTheDocument();
    expect(screen.getByText("Yes, I already have past investment")).toBeInTheDocument();
    expect(screen.getByText("No, I am starting now")).toBeInTheDocument();
  });

  it("requires an amount and date before adding an expected benefit", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <InvestmentFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        accounts={[]}
        assetTypeConfigs={[]}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Benefit" }));
    await user.click(screen.getAllByRole("button", { name: "Add Benefit" })[1]);

    expect(await screen.findByText("Amount must be greater than 0")).toBeInTheDocument();
    expect(screen.getByText("Benefit date is required")).toBeInTheDocument();
  });
});