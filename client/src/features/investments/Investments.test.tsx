import { act, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import { useNotificationStore } from "../../store/notificationStore";
import Investments, {
  buildRecurringConfirmPayload,
  buildRecurringPayloadFromFormValues,
  buildRecurringPlanUpdatePayloadFromFormValues,
  buildRecurringReviewState,
  mapFrequencyToCadence,
  toDateOnly,
} from "./Investments";

const mocks = vi.hoisted(() => ({
  summary: {
    investments: [] as Array<Record<string, unknown>>,
    pagination: {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
    },
    loading: false,
    error: null as Error | null,
  },
  reference: {
    taxonomyNodes: [] as Array<Record<string, unknown>>,
    accounts: [] as Array<Record<string, unknown>>,
    assetTypeConfigs: [] as Array<Record<string, unknown>>,
    loading: false,
    error: null as Error | null,
    reload: vi.fn(),
    ready: true,
  },
  dashboard: {
    loading: false,
    error: null as Error | null,
  },
  benefits: {
    loading: false,
    error: null as Error | null,
  },
  investment: {
    data: null as Record<string, unknown> | null,
  },
  save: vi.fn(),
  summaryQuery: vi.fn(),
  remove: vi.fn(),
  saveTaxonomy: vi.fn(),
  removeTaxonomy: vi.fn(),
  useHeaderAction: vi.fn(),
}));

vi.mock("./hooks/useInvestments", () => ({
  useInvestmentSummaryPageData: (params: Record<string, unknown>) => {
    mocks.summaryQuery(params);
    return {
    ...mocks.summary,
    pagination: {
      ...mocks.summary.pagination,
      total: mocks.summary.pagination.total || mocks.summary.investments.length,
      totalPages: mocks.summary.pagination.totalPages || (mocks.summary.investments.length ? 1 : 0),
    },
    };
  },
  useInvestmentReferenceData: () => mocks.reference,
  useInvestmentDashboardAnalytics: () => ({
    data: {
      responseContext: { currency: "INR" },
      widgets: {
        portfolioGrowth: { order: [], byKey: {} },
        capitalDeployment: { order: [], byKey: {} },
        assetTypePerformance: { rows: [] },
        allocationMix: { rows: [] },
        kpis: {
          totalContributions: {},
          currentPortfolioValue: {},
          upcomingMaturity: {},
          insuranceCover: {},
          insurancePremiumsPaid: {},
        },
        sourceOfValue: {},
        topHoldings: [],
        recentlyAdded: [],
        upcomingContributions: [],
      },
    },
    isLoading: mocks.dashboard.loading,
    isPending: mocks.dashboard.loading,
    error: mocks.dashboard.error,
  }),
  useInvestment: () => ({ data: mocks.investment.data }),
  useInvestmentEventsByInvestment: () => ({ data: [] }),
  useInvestmentPerformance: () => ({ data: null }),
  useInvestmentSnapshotsByInvestment: () => ({ data: [] }),
  useSaveInvestment: () => ({ mutateAsync: mocks.save }),
  useRemoveInvestment: () => ({ mutateAsync: mocks.remove }),
}));

vi.mock("./hooks/useInvestmentBenefits", () => ({
  useInvestmentBenefits: () => ({
    data: [],
    isLoading: mocks.benefits.loading,
    isPending: mocks.benefits.loading,
    error: mocks.benefits.error,
  }),
}));

vi.mock("./hooks/useInvestmentAssetTaxonomy", () => ({
  useSaveInvestmentAssetTaxonomy: () => ({ mutateAsync: mocks.saveTaxonomy }),
  useRemoveInvestmentAssetTaxonomy: () => ({
    mutateAsync: mocks.removeTaxonomy,
  }),
}));

vi.mock("../../hooks/useHeaderAction", () => ({
  useHeaderAction: mocks.useHeaderAction,
}));

vi.mock("./components/investmentsTableColumns", () => ({
  getInvestmentsTableColumns: ({
    onView,
    onEdit,
    onDelete,
  }: {
    onView: (investment: Record<string, unknown>) => void;
    onEdit: (investment: Record<string, unknown>) => void;
    onDelete: (investment: Record<string, unknown>) => void;
  }) => [
    {
      field: "actions",
      renderCell: ({ row }: { row: Record<string, unknown> }) => (
        <>
          <button type="button" onClick={() => onView(row)}>
            View Growth Fund
          </button>
          <button type="button" onClick={() => onEdit(row)}>
            Edit Growth Fund
          </button>
          <button type="button" onClick={() => onDelete(row)}>
            Delete Growth Fund
          </button>
        </>
      ),
    },
  ],
}));

vi.mock("./components/InvestmentFormDrawer", () => ({
  default: ({
    open,
    onSubmit,
    onClose,
    title,
    initialValues,
  }: {
    open: boolean;
    onSubmit: (values: Record<string, unknown>) => Promise<unknown>;
    onClose: () => void;
    title: string;
    initialValues: Record<string, unknown> | null;
  }) => {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const submit = async (formValues: Record<string, unknown>) => {
      const error = await onSubmit(formValues);
      setSubmitError(typeof error === "string" ? error : null);
    };
    const values = {
      accountId: "42",
      name: "Growth Fund",
      type: "mutual_fund",
      category: "equity",
      institution: "Example Bank",
      totalInvested: "900",
      currentValue: "1000",
      startDate: "2026-01-01",
      status: "active",
      maturityDate: null,
      referenceNumber: "",
      notes: "",
      insuranceCover: "",
    };

    return open ? (
      <section aria-label="Investment form drawer">
        <h2>{title}</h2>
        <p>Editing: {String(initialValues?.name ?? "new investment")}</p>
        {submitError ? <p>{submitError}</p> : null}
        <button type="button" onClick={onClose}>
          Close investment form
        </button>
        <button
          type="button"
          onClick={() =>
            void submit({ ...values, contributionType: "one_time" })
          }
        >
          Submit investment
        </button>
        <button
          type="button"
          onClick={() =>
            void submit({
              ...values,
              contributionType: "recurring",
              recurringPlan: {
                frequency: "monthly",
                amount: "100",
                anchorDate: "2026-02-01",
                historicalImportMode: "TRACK_FROM_TODAY",
              },
            })
          }
        >
          Submit recurring investment
        </button>
      </section>
    ) : null;
  },
}));

vi.mock("./components/InvestmentAssetTaxonomyFormDrawer", () => ({
  default: ({
    open,
    onSubmit,
    onDelete,
    onClose,
    submitError,
  }: {
    open: boolean;
    onSubmit: (values: Record<string, unknown>) => Promise<unknown>;
    onDelete: (value: Record<string, unknown>) => void;
    onClose: () => void;
    submitError?: string;
  }) =>
    open ? (
      <section aria-label="Asset taxonomy drawer">
        <button type="button" onClick={onClose}>
          Close taxonomy drawer
        </button>
        <button
          type="button"
          onClick={() => void onSubmit({ label: "Equities" })}
        >
          Save taxonomy
        </button>
        <button
          type="button"
          onClick={() =>
            void onSubmit({ id: "taxonomy-1", label: "Updated equities" })
          }
        >
          Update taxonomy
        </button>
        <button type="button" onClick={() => onDelete({ id: "taxonomy-1" })}>
          Delete taxonomy
        </button>
        {submitError ? <p>{submitError}</p> : null}
      </section>
    ) : null,
}));

vi.mock("./components/InvestmentViewDrawer", () => ({
  InvestmentViewDrawer: ({
    open,
    investment,
    onClose,
    onEdit,
    onRecordActivity,
    onEditActivity,
  }: {
    open: boolean;
    investment: Record<string, unknown> | null;
    onClose: () => void;
    onEdit: (value: Record<string, unknown>) => void;
    onRecordActivity: (
      value: Record<string, unknown>,
      plan?: Record<string, unknown> | null,
      mode?: string,
    ) => void;
    onEditActivity: (
      value: Record<string, unknown>,
      item: Record<string, unknown>,
      mode: string,
    ) => void;
  }) =>
    open && investment ? (
      <section aria-label="Investment view drawer">
        <p>{String(investment.name)}</p>
        <button type="button" onClick={onClose}>
          Close investment details
        </button>
        <button type="button" onClick={() => onEdit(investment)}>
          Edit from details
        </button>
        <button
          type="button"
          onClick={() => onRecordActivity(investment, null, "income_credit")}
        >
          Record income
        </button>
        <button
          type="button"
          onClick={() =>
            onEditActivity(investment, { id: "event-1" }, "income_credit")
          }
        >
          Edit income
        </button>
        <button
          type="button"
          onClick={() => onEditActivity(investment, { id: "benefit-1" }, "benefit")}
        >
          Edit benefit
        </button>
      </section>
    ) : null,
}));

vi.mock("./components/RecordInvestmentActivityModal", () => ({
  default: ({
    open,
    onClose,
    investment,
    initialMode,
    editingEvent,
    editingBenefit,
  }: {
    open: boolean;
    onClose: () => void;
    investment?: Record<string, unknown>;
    initialMode: string;
    editingEvent?: Record<string, unknown> | null;
    editingBenefit?: Record<string, unknown> | null;
  }) =>
    open ? (
      <section aria-label="Record investment activity">
        <p>Activity investment: {String(investment?.name)}</p>
        <p>Activity mode: {initialMode}</p>
        <p>Editing event: {String(editingEvent?.id ?? "none")}</p>
        <p>Editing benefit: {String(editingBenefit?.id ?? "none")}</p>
        <button type="button" onClick={onClose}>
          Close activity
        </button>
      </section>
    ) : null,
}));

vi.mock("./components/RecurringOccurrencesReviewDialog", () => ({
  default: ({
    open,
    onCancel,
    onConfirm,
    loading,
    items,
    investmentName,
  }: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    loading: boolean;
    items: Array<Record<string, unknown>>;
    investmentName: string;
  }) =>
    open ? (
      <section aria-label="Recurring investment review">
        <p>Review investment: {investmentName}</p>
        <p>Historical items: {items.length}</p>
        <button type="button" onClick={onCancel}>
          Cancel recurring review
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void onConfirm()}
        >
          Confirm recurring investment
        </button>
      </section>
    ) : null,
}));

vi.mock("../../components/dialogs/ConfirmDialog", () => ({
  default: ({
    open,
    onCancel,
    onConfirm,
  }: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }) =>
    open ? (
      <section aria-label="Delete investment dialog">
        <button type="button" onClick={onCancel}>
          Cancel deletion
        </button>
        <button type="button" onClick={onConfirm}>
          Confirm deletion
        </button>
      </section>
    ) : null,
}));

const investment = {
  id: "investment-1",
  name: "Growth Fund",
  status: "active",
  currentValue: 1000,
  totalInvested: 900,
};

const investmentDetails = {
  ...investment,
  activeContributionPlan: {
    id: "9",
    status: "active",
    amount: 100,
    cadenceUnit: "month",
    cadenceInterval: 1,
  },
};

const resetMocks = () => {
  mocks.summary.investments = [];
  mocks.summary.pagination = {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
  };
  mocks.summary.loading = false;
  mocks.summary.error = null;
  mocks.reference.taxonomyNodes = [];
  mocks.reference.accounts = [];
  mocks.reference.assetTypeConfigs = [];
  mocks.reference.loading = false;
  mocks.reference.error = null;
  mocks.reference.reload.mockReset();
  mocks.dashboard.loading = false;
  mocks.dashboard.error = null;
  mocks.benefits.loading = false;
  mocks.benefits.error = null;
  mocks.investment.data = null;
  mocks.save.mockReset();
  mocks.summaryQuery.mockReset();
  mocks.remove.mockReset();
  mocks.saveTaxonomy.mockReset();
  mocks.removeTaxonomy.mockReset();
  mocks.useHeaderAction.mockReset();
};

describe("Investments", () => {
  beforeEach(resetMocks);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state while investment summary is being fetched", () => {
    mocks.summary.loading = true;

    renderWithProviders(<Investments />);

    expect(screen.getByText("Loading investments...")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manage Taxonomy" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["reference data", () => (mocks.reference.loading = true)],
    ["dashboard analytics", () => (mocks.dashboard.loading = true)],
    ["investment benefits", () => (mocks.benefits.loading = true)],
  ])("keeps the investment list available while %s is being fetched", (_source, setLoading) => {
    setLoading();
    mocks.summary.investments = [investment];

    renderWithProviders(<Investments />);

    expect(screen.getByRole("button", { name: "View Growth Fund" })).toBeInTheDocument();
    expect(screen.queryByText("Loading investments...")).not.toBeInTheDocument();
  });

  it.each([
    ["investment summary", () => (mocks.summary.error = new Error("Unavailable")), "Failed to load investments"],
    ["reference data", () => (mocks.reference.error = new Error("Unavailable")), "Failed to load investment reference data"],
    ["investment benefits", () => (mocks.benefits.error = new Error("Unavailable")), "Failed to load investment benefits"],
    ["dashboard analytics", () => (mocks.dashboard.error = new Error("Unavailable")), "Failed to load investment dashboard"],
  ])("shows the appropriate error when %s fails", (_source, setError, message) => {
    setError();

    renderWithProviders(<Investments />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("shows an empty state and warns when creating without an account", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );

    renderWithProviders(<Investments />);

    expect(screen.getByText("No investments added yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Investment" }));

    expect(pushNotification).toHaveBeenCalledWith({
      type: "warning",
      message: "Please add a financial account before adding an investment.",
    });
    expect(
      screen.queryByRole("region", { name: "Investment form drawer" }),
    ).not.toBeInTheDocument();
  });

  it("opens the create form when an account is available", async () => {
    const user = userEvent.setup();
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Add Investment" }));

    expect(
      screen.getByRole("region", { name: "Investment form drawer" }),
    ).toBeInTheDocument();
    expect(mocks.useHeaderAction).toHaveBeenCalledWith(
      "investments",
      expect.objectContaining({ disabled: false }),
    );
  });

  it("opens the create form through the registered header action", () => {
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];

    renderWithProviders(<Investments />);
    const action = mocks.useHeaderAction.mock.lastCall?.[1];
    expect(action).toEqual(expect.objectContaining({ label: "Investment", disabled: false }));
    act(() => action.onClick());

    expect(
      screen.getByRole("region", { name: "Investment form drawer" }),
    ).toBeInTheDocument();
  });

  it("sends filters to the summary query and renders the server-filtered empty state", async () => {
    const user = userEvent.setup();
    mocks.summary.investments = [
      { ...investment, type: "mutual_fund", assetType: "mutual_fund" },
    ];
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];
    mocks.reference.assetTypeConfigs = [
      { code: "mutual_fund", label: "Mutual Funds", categories: [] },
      { code: "equity", label: "Equity", categories: [] },
    ];

    const view = renderWithProviders(<Investments />);

    expect(
      screen.getByPlaceholderText(
        "Search by name, type, institution, or reference",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset Filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Growth Fund" })).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(
        "Search by name, type, institution, or reference",
      ),
      "not in portfolio",
    );
    await waitFor(() => expect(mocks.summaryQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "not in portfolio", page: 1 }),
    ));
    mocks.summary.investments = [];
    view.rerender(<Investments />);
    expect(
      screen.getByRole("heading", { name: "No investments match current filters" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Add your first investment to start tracking value, maturity, and recurring contributions.",
      ),
    ).not.toBeInTheDocument();

    mocks.summary.investments = [investment];
    await user.click(screen.getByRole("button", { name: "Reset Filters" }));
    expect(
      screen.getByRole("button", { name: "View Growth Fund" }),
    ).toBeInTheDocument();

    const [, statusFilter] = screen.getAllByRole("combobox");
    await user.click(statusFilter);
    await user.click(screen.getByRole("option", { name: "Matured" }));
    expect(mocks.summaryQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "matured", search: undefined, page: 1 }),
    );
    mocks.summary.investments = [];
    view.rerender(<Investments />);
    expect(
      screen.getByRole("heading", { name: "No investments match current filters" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Add your first investment to start tracking value, maturity, and recurring contributions.",
      ),
    ).not.toBeInTheDocument();

    mocks.summary.investments = [investment];
    await user.click(screen.getByRole("button", { name: "Reset Filters" }));
    expect(
      screen.getByRole("button", { name: "View Growth Fund" }),
    ).toBeInTheDocument();
  });

  it("opens and closes the investment view drawer for a selected investment", async () => {
    const user = userEvent.setup();
    mocks.summary.investments = [investment];
    mocks.investment.data = investmentDetails;

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "View Growth Fund" }));

    expect(
      screen.getByRole("region", { name: "Investment view drawer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Growth Fund")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close investment details" }));
    expect(
      screen.queryByRole("region", { name: "Investment view drawer" }),
    ).not.toBeInTheDocument();
  });

  it("opens the edit form from the investment view drawer", async () => {
    const user = userEvent.setup();
    mocks.summary.investments = [investment];
    mocks.investment.data = investmentDetails;

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "View Growth Fund" }));
    await user.click(screen.getByRole("button", { name: "Edit from details" }));

    expect(
      screen.getByRole("region", { name: "Investment form drawer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Editing: Growth Fund")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Investment view drawer" }),
    ).not.toBeInTheDocument();
  });

  it("wires view-drawer activity actions to the activity modal", async () => {
    const user = userEvent.setup();
    mocks.summary.investments = [investment];
    mocks.investment.data = investmentDetails;

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "View Growth Fund" }));
    await user.click(screen.getByRole("button", { name: "Record income" }));

    expect(screen.getByText("Activity mode: income_credit")).toBeInTheDocument();
    expect(screen.getByText("Activity investment: Growth Fund")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close activity" }));
    await user.click(screen.getByRole("button", { name: "Edit income" }));
    expect(screen.getByText("Editing event: event-1")).toBeInTheDocument();
    expect(screen.getByText("Editing benefit: none")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close activity" }));
    await user.click(screen.getByRole("button", { name: "Edit benefit" }));
    expect(screen.getByText("Activity mode: benefit")).toBeInTheDocument();
    expect(screen.getByText("Editing event: none")).toBeInTheDocument();
    expect(screen.getByText("Editing benefit: benefit-1")).toBeInTheDocument();
  });

  it("saves a one-time investment and closes the form on success", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];
    mocks.save.mockResolvedValue({ id: "investment-2" });

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    await user.click(screen.getByRole("button", { name: "Submit investment" }));

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        payload: expect.objectContaining({
          accountId: 42,
          name: "Growth Fund",
          assetType: "mutual_fund",
          assetCategory: "equity",
          totalInvested: 900,
          currentValue: 1000,
          currency: "INR",
          contributionMode: "ONE_TIME",
        }),
        selectedInvestmentId: null,
      }),
    );
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Investment added",
    });
    expect(
      screen.queryByRole("region", { name: "Investment form drawer" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the create form open and shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];
    mocks.save.mockRejectedValue(new Error("Duplicate investment"));

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    await user.click(screen.getByRole("button", { name: "Submit investment" }));

    expect(await screen.findByText("Duplicate investment")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Investment form drawer" }),
    ).toBeInTheDocument();
    expect(pushNotification).not.toHaveBeenCalled();
  });

  it("opens the edit form and saves changes against the selected investment", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.summary.investments = [investment];
    mocks.investment.data = investment;
    mocks.save.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Edit Growth Fund" }));

    expect(screen.getByText("Editing: Growth Fund")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit investment" }));

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedInvestmentId: "investment-1",
          payload: expect.objectContaining({
            name: "Growth Fund",
            contributionMode: "ONE_TIME",
          }),
        }),
      ),
    );
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Investment updated",
    });
    expect(
      screen.queryByRole("region", { name: "Investment form drawer" }),
    ).not.toBeInTheDocument();
  });

  it("cancels a pending investment deletion without calling the mutation", async () => {
    const user = userEvent.setup();
    mocks.summary.investments = [investment];

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Delete Growth Fund" }));
    await user.click(screen.getByRole("button", { name: "Cancel deletion" }));

    expect(mocks.remove).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("region", { name: "Delete investment dialog" }),
    ).not.toBeInTheDocument();
  });

  it("deletes an investment after confirmation", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.summary.investments = [investment];
    mocks.remove.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Delete Growth Fund" }));
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("investment-1"));
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Investment removed",
    });
    expect(
      screen.queryByRole("region", { name: "Delete investment dialog" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the delete dialog open and reports a deletion failure", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.summary.investments = [investment];
    mocks.remove.mockRejectedValue(new Error("In use"));

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Delete Growth Fund" }));
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    expect(await screen.findByText("Failed to remove investment")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Delete investment dialog" }),
    ).toBeInTheDocument();
    expect(pushNotification).toHaveBeenCalledWith({
      type: "error",
      message: "Failed to remove investment",
    });
  });

  it("saves a new taxonomy node and reports success", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.saveTaxonomy.mockResolvedValue({ id: "taxonomy-1", label: "Equities" });
    mocks.reference.reload.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Manage Taxonomy" }));
    await user.click(screen.getByRole("button", { name: "Save taxonomy" }));

    await waitFor(() =>
      expect(mocks.saveTaxonomy).toHaveBeenCalledWith({ label: "Equities" }),
    );
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Asset taxonomy saved",
    });
  });

  it("updates an existing taxonomy node", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.saveTaxonomy.mockResolvedValue({ id: "taxonomy-1" });
    mocks.reference.reload.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Manage Taxonomy" }));
    await user.click(screen.getByRole("button", { name: "Update taxonomy" }));

    await waitFor(() =>
      expect(mocks.saveTaxonomy).toHaveBeenCalledWith({
        id: "taxonomy-1",
        label: "Updated equities",
      }),
    );
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Asset taxonomy updated",
    });
  });

  it("shows the taxonomy save error and clears it when the drawer closes", async () => {
    const user = userEvent.setup();
    mocks.saveTaxonomy.mockRejectedValue(new Error("Taxonomy conflict"));

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Manage Taxonomy" }));
    await user.click(screen.getByRole("button", { name: "Save taxonomy" }));

    expect(await screen.findByText("Taxonomy conflict")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close taxonomy drawer" }));
    await user.click(screen.getByRole("button", { name: "Manage Taxonomy" }));
    expect(screen.queryByText("Taxonomy conflict")).not.toBeInTheDocument();
  });

  it("keeps the taxonomy drawer open after a failed save and allows retry", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.saveTaxonomy.mockRejectedValueOnce(new Error("Save failed"))
      .mockResolvedValueOnce({ id: "taxonomy-1" });

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Manage Taxonomy" }));
    await user.click(screen.getByRole("button", { name: "Save taxonomy" }));

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(pushNotification).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Asset taxonomy drawer" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save taxonomy" }));
    await waitFor(() => expect(pushNotification).toHaveBeenCalledWith({
      type: "success", message: "Asset taxonomy saved",
    }));
    expect(screen.queryByText("Save failed")).not.toBeInTheDocument();
  });

  it("removes a taxonomy node and reports success", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.removeTaxonomy.mockResolvedValue(undefined);
    mocks.reference.reload.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Manage Taxonomy" }));
    await user.click(screen.getByRole("button", { name: "Delete taxonomy" }));

    await waitFor(() =>
      expect(mocks.removeTaxonomy).toHaveBeenCalledWith("taxonomy-1"),
    );
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Asset taxonomy removed",
    });
  });

  it("reports taxonomy deletion failures", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.removeTaxonomy.mockRejectedValue(new Error("Taxonomy is in use"));

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Manage Taxonomy" }));
    await user.click(screen.getByRole("button", { name: "Delete taxonomy" }));

    await waitFor(() =>
      expect(pushNotification).toHaveBeenCalledWith({
        type: "error",
        message: "Failed to remove asset taxonomy",
      }),
    );
    expect(mocks.reference.reload).not.toHaveBeenCalled();
  });

  it("confirms a new recurring investment and contribution plan", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];
    mocks.save.mockResolvedValue({ id: "investment-2" });

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    await user.click(
      screen.getByRole("button", { name: "Submit recurring investment" }),
    );

    expect(
      screen.getByRole("region", { name: "Recurring investment review" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Review investment: Growth Fund")).toBeInTheDocument();
    expect(screen.getByText("Historical items: 0")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Confirm recurring investment" }),
    );

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
        selectedInvestmentId: null,
        payload: expect.objectContaining({
          contributionMode: "RECURRING",
          recurringPlan: expect.objectContaining({
            amount: 100,
            cadenceUnit: "month",
            cadenceInterval: 1,
            anchorDate: "2026-02-01",
            historicalImportMode: "TRACK_FROM_TODAY",
            reviewedHistoricalItems: [],
          }),
        }),
      }),
    );
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Investment and recurring plan created",
    });
    expect(
      screen.queryByRole("region", { name: "Recurring investment review" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the form when recurring review is cancelled", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    await user.click(
      screen.getByRole("button", { name: "Submit recurring investment" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel recurring review" }));

    expect(
      screen.queryByRole("region", { name: "Recurring investment review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Investment form drawer" }),
    ).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(pushNotification).not.toHaveBeenCalled();
  });

  it("keeps review open after an atomic save fails and allows retry without client rollback", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];
    mocks.save.mockRejectedValueOnce(new Error("Plan conflict"))
      .mockResolvedValueOnce({ id: "investment-2" });

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    await user.click(
      screen.getByRole("button", { name: "Submit recurring investment" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm recurring investment" }),
    );

    await waitFor(() => expect(pushNotification).toHaveBeenCalledWith({
      type: "error",
      message: "Plan conflict",
    }));
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(
      screen.getByRole("region", { name: "Recurring investment review" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm recurring investment" }));
    await waitFor(() => expect(
      screen.queryByRole("region", { name: "Recurring investment review" }),
    ).not.toBeInTheDocument());
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save).toHaveBeenNthCalledWith(2, mocks.save.mock.calls[0][0]);
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success", message: "Investment and recurring plan created",
    });
  });

  it("keeps recurring review open until the atomic save succeeds", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.reference.accounts = [{ id: 42, name: "Checking" }];
    let resolveSave!: (value: { id: string }) => void;
    mocks.save.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Add Investment" }));
    await user.click(
      screen.getByRole("button", { name: "Submit recurring investment" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm recurring investment" }),
    );

    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(pushNotification).not.toHaveBeenCalled();
    expect(
      screen.getByRole("region", { name: "Recurring investment review" }),
    ).toBeInTheDocument();
    await act(async () => { resolveSave({ id: "investment-2" }); });
    expect(screen.queryByRole("region", { name: "Recurring investment review" })).not.toBeInTheDocument();
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success", message: "Investment and recurring plan created",
    });
  });

  it("updates an existing contribution plan instead of creating another", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.summary.investments = [investment];
    mocks.investment.data = investmentDetails;
    mocks.save.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Edit Growth Fund" }));
    await user.click(
      screen.getByRole("button", { name: "Submit recurring investment" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm recurring investment" }),
    );

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
        selectedInvestmentId: "investment-1",
        payload: expect.objectContaining({
          recurringPlanId: 9,
          recurringPlanUpdate: expect.objectContaining({
            amount: 100,
            cadenceUnit: "month",
            cadenceInterval: 1,
            status: "active",
          }),
        }),
      }),
    );
    expect(mocks.save.mock.calls[0][0].payload).not.toHaveProperty("recurringPlan");
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success",
      message: "Investment updated and recurring plan confirmed",
    });
  });

  it("creates a recurring plan when the edited investment has no existing plan", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.summary.investments = [investment];
    mocks.investment.data = investment;
    mocks.save.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Edit Growth Fund" }));
    await user.click(
      screen.getByRole("button", { name: "Submit recurring investment" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm recurring investment" }),
    );

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
        selectedInvestmentId: "investment-1",
        payload: expect.objectContaining({
          recurringPlan: expect.objectContaining({ amount: 100, cadenceUnit: "month" }),
        }),
      }),
    );
    expect(mocks.save.mock.calls[0][0].payload).not.toHaveProperty("recurringPlanId");
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success", message: "Investment updated and recurring plan confirmed",
    });
  });

  it("preserves a paused contribution plan when saving recurring changes", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.summary.investments = [investment];
    mocks.investment.data = {
      ...investmentDetails,
      activeContributionPlan: { ...investmentDetails.activeContributionPlan, status: "paused" },
    };
    mocks.save.mockResolvedValue(undefined);

    renderWithProviders(<Investments />);
    await user.click(screen.getByRole("button", { name: "Edit Growth Fund" }));
    await user.click(
      screen.getByRole("button", { name: "Submit recurring investment" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm recurring investment" }),
    );

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
        selectedInvestmentId: "investment-1",
        payload: expect.objectContaining({
          recurringPlanId: 9,
          recurringPlanUpdate: expect.objectContaining({ status: "paused" }),
        }),
      }),
    );
    expect(pushNotification).toHaveBeenCalledWith({
      type: "success", message: "Investment updated and recurring plan confirmed",
    });
  });
});

describe("toDateOnly", () => {
  it("returns a date-only value for valid dates and null for missing or invalid values", () => {
    expect(toDateOnly("2026-01-15T12:00:00Z")).toBe("2026-01-15");
    expect(toDateOnly("2026-01-15")).toBe("2026-01-15");
    expect(toDateOnly("invalid")).toBeNull();
    expect(toDateOnly("")).toBeNull();
    expect(toDateOnly(null)).toBeNull();
  });
});

describe("mapFrequencyToCadence", () => {
  it.each([
    ["weekly", "week", 1],
    ["monthly", "month", 1],
    ["quarterly", "quarter", 1],
    ["halfyearly", "month", 6],
    ["yearly", "year", 1],
  ])("maps %s to its recurring cadence", (frequency, cadenceUnit, cadenceInterval) => {
    expect(mapFrequencyToCadence(frequency)).toEqual({
      cadenceUnit,
      cadenceInterval,
    });
  });

  it("defaults unsupported and missing frequencies to monthly", () => {
    expect(mapFrequencyToCadence("unknown")).toEqual({
      cadenceUnit: "month",
      cadenceInterval: 1,
    });
    expect(mapFrequencyToCadence()).toEqual({
      cadenceUnit: "month",
      cadenceInterval: 1,
    });
  });
});

const baseFormValues = {
  name: "Retirement Fund",
  status: "active",
  startDate: "2026-01-15T12:00:00Z",
  recurringPlan: {
    frequency: "halfyearly",
    amount: "5000",
    anchorDate: "2026-02-01T12:00:00Z",
    nextContributionDate: "2026-03-01T12:00:00Z",
    endDate: "2027-02-01T12:00:00Z",
    historicalImportMode: "OPENING_BALANCE",
    openingPrincipalAmount: "12000",
    openingIncomeAmount: "500",
  },
};

describe("buildRecurringPayloadFromFormValues", () => {
  it("normalizes the amount, cadence, dates, import mode, and opening amounts", () => {
    expect(buildRecurringPayloadFromFormValues(baseFormValues)).toEqual({
      amount: 5000,
      cadenceUnit: "month",
      cadenceInterval: 6,
      anchorDate: "2026-02-01",
      endDate: "2027-02-01",
      historicalImportMode: "OPENING_BALANCE",
      autoCreateEvent: false,
      openingPrincipalAmount: 12000,
      openingIncomeAmount: 500,
    });
  });

  it("uses the start date and defaults when optional recurring values are absent", () => {
    expect(
      buildRecurringPayloadFromFormValues({
        startDate: "2026-01-15",
        recurringPlan: { frequency: "monthly" },
      }),
    ).toEqual({
      amount: 0,
      cadenceUnit: "month",
      cadenceInterval: 1,
      anchorDate: "2026-01-15",
      endDate: undefined,
      historicalImportMode: "TRACK_FROM_TODAY",
      autoCreateEvent: false,
      openingPrincipalAmount: undefined,
      openingIncomeAmount: undefined,
    });
  });

  it("omits invalid end dates and blank opening amounts", () => {
    expect(
      buildRecurringPayloadFromFormValues({
        recurringPlan: {
          frequency: "monthly",
          anchorDate: "invalid",
          endDate: "invalid",
          openingPrincipalAmount: "",
          openingIncomeAmount: "",
        },
      }),
    ).toMatchObject({
      anchorDate: null,
      historicalImportMode: "TRACK_FROM_TODAY",
      autoCreateEvent: false,
    });
    expect(
      buildRecurringPayloadFromFormValues({
        recurringPlan: {
          frequency: "monthly",
          openingPrincipalAmount: "",
          openingIncomeAmount: "",
        },
      }),
    ).toMatchObject({
      openingPrincipalAmount: undefined,
      openingIncomeAmount: undefined,
    });
  });
});

describe("buildRecurringPlanUpdatePayloadFromFormValues", () => {
  it("preserves the existing plan status and excludes opening-event fields", () => {
    expect(
      buildRecurringPlanUpdatePayloadFromFormValues(baseFormValues, {
        status: "paused",
      }),
    ).toEqual({
      amount: 5000,
      cadenceUnit: "month",
      cadenceInterval: 6,
      anchorDate: "2026-02-01",
      endDate: "2027-02-01",
      historicalImportMode: "OPENING_BALANCE",
      nextDueDate: "2026-03-01",
      status: "paused",
    });
  });

  it("sets status to undefined when there is no existing plan status", () => {
    expect(
      buildRecurringPlanUpdatePayloadFromFormValues(baseFormValues, null),
    ).toHaveProperty("status", undefined);
  });

  it("clears the next due date when the optional form date is cleared", () => {
    const formValues = {
      ...baseFormValues,
      recurringPlan: {
        ...baseFormValues.recurringPlan,
        nextContributionDate: null,
      },
    };

    expect(
      buildRecurringPlanUpdatePayloadFromFormValues(formValues, null),
    ).toHaveProperty("nextDueDate", null);
  });
});

describe("buildRecurringReviewState", () => {
  it("creates review events only for positive opening principal and income amounts", () => {
    const state = buildRecurringReviewState({
      formValues: baseFormValues,
      nextInvestment: {
        name: "Retirement Fund",
        status: "active",
        currentValue: 1000,
      },
      drawerMode: "create",
      selectedInvestmentId: null,
      selectedInvestment: null,
    });

    expect(state.alreadyHasActivePlan).toBe(false);
    expect(state.reviewedHistoricalItems).toEqual([
      expect.objectContaining({
        amount: 12000,
        eventType: "OPENING_BALANCE",
        dueDate: "2026-01-15",
        selected: true,
        status: "CONFIRMED",
      }),
      expect.objectContaining({
        amount: 500,
        eventType: "OPENING_INCOME_CREDIT",
        dueDate: "2026-01-15",
        selected: true,
        status: "CONFIRMED",
      }),
    ]);
    expect(state.reviewSummary.recurring).toEqual([
      { label: "Contribution", value: expect.any(String) },
      { label: "Anchor date", value: "01/02/2026" },
      { label: "Import mode", value: "OPENING_BALANCE" },
    ]);
  });

  it("does not create opening review items for zero amounts or non-opening import modes", () => {
    const state = buildRecurringReviewState({
      formValues: {
        ...baseFormValues,
        recurringPlan: {
          ...baseFormValues.recurringPlan,
          openingPrincipalAmount: "0",
          openingIncomeAmount: "-1",
        },
      },
      nextInvestment: { name: "Fund", status: "active" },
      drawerMode: "create",
      selectedInvestmentId: null,
      selectedInvestment: null,
    });
    const trackedFromToday = buildRecurringReviewState({
      formValues: {
        ...baseFormValues,
        recurringPlan: {
          ...baseFormValues.recurringPlan,
          historicalImportMode: "TRACK_FROM_TODAY",
        },
      },
      nextInvestment: { name: "Fund", status: "active" },
      drawerMode: "create",
      selectedInvestmentId: null,
      selectedInvestment: null,
    });

    expect(state.reviewedHistoricalItems).toEqual([]);
    expect(trackedFromToday.reviewedHistoricalItems).toEqual([]);
  });

  it("does not duplicate opening events when editing an investment with an active plan", () => {
    const state = buildRecurringReviewState({
      formValues: baseFormValues,
      nextInvestment: { name: "Updated Fund", status: "active" },
      drawerMode: "edit",
      selectedInvestmentId: 7,
      selectedInvestment: {
        id: 7,
        name: "Old Fund",
        activeContributionPlan: { id: 9 },
      },
    });

    expect(state.alreadyHasActivePlan).toBe(true);
    expect(state.activePlanId).toBe(9);
    expect(state.selectedInvestmentId).toBe(7);
    expect(state.investmentName).toBe("Updated Fund");
    expect(state.reviewedHistoricalItems).toEqual([]);
  });

  it("uses the selected investment name when the next payload has no name", () => {
    const state = buildRecurringReviewState({
      formValues: {
        recurringPlan: {
          frequency: "monthly",
          historicalImportMode: "TRACK_FROM_TODAY",
        },
      },
      nextInvestment: {},
      drawerMode: "edit",
      selectedInvestmentId: "investment-1",
      selectedInvestment: { name: "Existing Fund" },
    });

    expect(state.investmentName).toBe("Existing Fund");
    expect(state.reviewSummary.investment).toEqual([
      { label: "Name", value: "-" },
      { label: "Status", value: "-" },
    ]);
  });
});

describe("buildRecurringConfirmPayload", () => {
  it("includes reviewed historical items in the recurring payload", () => {
    const items = [{ amount: 100, eventType: "OPENING_BALANCE" }];

    expect(buildRecurringConfirmPayload({ amount: 500 }, items)).toEqual({
      amount: 500,
      reviewedHistoricalItems: items,
    });
  });

  it("defaults a missing or non-array reviewed-items value to an empty array", () => {
    expect(buildRecurringConfirmPayload({ amount: 500 }, undefined)).toEqual({
      amount: 500,
      reviewedHistoricalItems: [],
    });
    expect(
      buildRecurringConfirmPayload({ amount: 500 }, "not-an-array" as never),
    ).toEqual({
      amount: 500,
      reviewedHistoricalItems: [],
    });
  });
});
