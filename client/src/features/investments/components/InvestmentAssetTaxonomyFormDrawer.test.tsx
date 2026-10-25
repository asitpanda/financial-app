import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "../../../test/test-utils";
import InvestmentAssetTaxonomyFormDrawer from "./InvestmentAssetTaxonomyFormDrawer";

const nodes = [
  {
    id: "type-1",
    label: "Investments",
    nodeType: "type",
    level: 1,
    parentId: null,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "category-1",
    label: "Equity",
    nodeType: "category",
    level: 2,
    parentId: "type-1",
    sortOrder: 0,
    isActive: true,
  },
];

describe("InvestmentAssetTaxonomyFormDrawer", () => {
  it("creates a root node with trimmed form values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      id: "type-2",
      label: "Fixed Income",
      level: 1,
      parentId: null,
    });

    renderWithProviders(
      <InvestmentAssetTaxonomyFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        taxonomyNodes={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Root" }));
    await user.type(screen.getByLabelText("Label"), "  Fixed Income  ");
    await user.clear(screen.getByLabelText("Node Type"));
    await user.type(screen.getByLabelText("Node Type"), "type");
    await user.click(screen.getByRole("button", { name: "Save Node" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      label: "Fixed Income",
      nodeType: "type",
      level: 1,
      parentId: undefined,
      defaultAssetType: undefined,
      defaultAssetCategory: undefined,
      sortOrder: 0,
      isActive: true,
    }));
  });

  it("selects an existing node and submits an edited label", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ ...nodes[1], label: "Stocks" });

    renderWithProviders(
      <InvestmentAssetTaxonomyFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        taxonomyNodes={nodes}
      />,
    );

    await user.click(screen.getByText("Equity"));
    await user.click(screen.getByRole("button", { name: "Edit Equity" }));
    await user.clear(screen.getByLabelText("Label"));
    await user.type(screen.getByLabelText("Label"), "Stocks");
    await user.click(screen.getByRole("button", { name: "Update Node" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      id: "category-1",
      label: "Stocks",
      level: 2,
      parentId: NaN,
    })));
  });
});