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
});