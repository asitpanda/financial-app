import type { ComponentProps, ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "../../../test/test-utils";
import InvestmentAssetTaxonomyFormDrawerComponent from "./InvestmentAssetTaxonomyFormDrawer";

const nodes = [
  {
    id: "1",
    label: "Investments",
    nodeType: "type",
    level: 1,
    parentId: null,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "2",
    label: "Equity",
    nodeType: "category",
    level: 2,
    parentId: "1",
    sortOrder: 0,
    isActive: true,
  },
];

const InvestmentAssetTaxonomyFormDrawer = InvestmentAssetTaxonomyFormDrawerComponent as ComponentType<
  Omit<ComponentProps<typeof InvestmentAssetTaxonomyFormDrawerComponent>, "taxonomyNodes"> & {
    taxonomyNodes?: typeof nodes;
  }
>;

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
        onDelete={vi.fn()}
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
        onDelete={vi.fn()}
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
      id: "2",
      label: "Stocks",
      level: 2,
      parentId: 1,
    })));
  });

  it("creates a child node under the selected parent", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      id: "3",
      label: "Domestic Equity",
      level: 3,
      parentId: 2,
    });

    renderWithProviders(
      <InvestmentAssetTaxonomyFormDrawer
        open
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onSubmit={onSubmit}
        taxonomyNodes={nodes}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add child to Equity" }));
    await user.type(screen.getByLabelText("Label"), "Domestic Equity");
    await user.click(screen.getByRole("button", { name: "Save Node" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      label: "Domestic Equity",
      nodeType: "subtype",
      level: 3,
      parentId: 2,
      defaultAssetType: undefined,
      defaultAssetCategory: undefined,
      sortOrder: 0,
      isActive: true,
    }));
  });

  it("shows a validation error and does not submit a duplicate sibling label", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <InvestmentAssetTaxonomyFormDrawer
        open
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onSubmit={onSubmit}
        taxonomyNodes={nodes}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add Root" }));
    await user.type(screen.getByLabelText("Label"), " Investments ");
    await user.click(screen.getByRole("button", { name: "Save Node" }));

    expect(screen.getByText("Label already exists under the selected parent")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows canceling deletion before confirming the selected branch removal", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    renderWithProviders(
      <InvestmentAssetTaxonomyFormDrawer
        open
        onClose={vi.fn()}
        onDelete={onDelete}
        onSubmit={vi.fn()}
        taxonomyNodes={nodes}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete Investments" }));
    expect(screen.getByText("Remove Investments from the asset taxonomy? Child nodes under this branch will also be removed.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete asset taxonomy" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete Investments" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining(nodes[0]));
  });
});