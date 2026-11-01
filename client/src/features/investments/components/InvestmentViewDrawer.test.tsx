import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../../../test/test-utils";
import { InvestmentViewDrawer } from "./InvestmentViewDrawer";

vi.mock("../hooks/useInvestments", () => ({
  useUpdateInvestment: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../hooks/useContributionPlans", () => ({
  useUpdateInvestmentContributionPlan: () => ({ mutateAsync: vi.fn() }),
  useDeleteInvestmentEvent: () => ({ mutateAsync: vi.fn() }),
  useRecordInvestmentContribution: () => ({ mutateAsync: vi.fn() }),
  useRecordInvestmentWithdrawal: () => ({ mutateAsync: vi.fn() }),
  useRecordInvestmentIncomeCredit: () => ({ mutateAsync: vi.fn() }),
  useUpdateInvestmentEvent: () => ({ mutateAsync: vi.fn() }),
  useSkipCurrentInvestmentContribution: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../hooks/useInvestmentSnapshots", () => ({
  useSaveInvestmentSnapshot: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteInvestmentSnapshot: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../hooks/useInvestmentBenefits", () => ({
  useInvestmentBenefitsByInvestment: () => ({ data: [] }),
  useDeleteInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
  useRealizeInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
  useCreateInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
  useUpdateInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
  useQuickRealizeInvestmentBenefit: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("../../../store/notificationStore", () => ({
  useNotificationStore: () => vi.fn(),
}));

describe("InvestmentViewDrawer", () => {
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
});