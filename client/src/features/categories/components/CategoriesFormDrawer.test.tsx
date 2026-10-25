import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test/test-utils";
import CategoryFormDrawer from "./CategoriesFormDrawer";

vi.mock("../useCategories", () => ({
  useCategories: () => ({
    data: [
      {
        id: "existing-category",
        name: "Groceries",
        type: "expense",
        userId: "user-1",
        createdAt: "",
        updatedAt: "",
      },
    ],
  }),
}));

describe("CategoriesFormDrawer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits trimmed values and resolves defaults for a new category", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderWithProviders(
      <CategoryFormDrawer open onClose={onClose} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText("Name"), "  Dining Out  ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Dining Out",
        type: "expense",
        icon: "cart",
        color: "#111827",
      }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("blocks invalid and duplicate names with field errors", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <CategoryFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Category name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Name"), " groceries ");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Category name already exists")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects invalid colors before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <CategoryFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    await user.type(screen.getByLabelText("Name"), "Utilities");
    const color = screen.getByPlaceholderText("#111827");
    act(() => {
      fireEvent.change(color, { target: { value: "not-a-color" } });
    });
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows submission errors and leaves entered form values intact", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue("Could not save category");

    renderWithProviders(
      <CategoryFormDrawer open onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    const nameField = screen.getByLabelText("Name");
    await user.type(nameField, "Utilities");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Could not save category")).toBeInTheDocument();
    expect(nameField).toHaveValue("Utilities");
  });

  it("prepopulates edit values and closes on cancel without submitting", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    renderWithProviders(
      <CategoryFormDrawer
        open
        onClose={onClose}
        onSubmit={onSubmit}
        initialValues={{
          id: "salary",
          name: "Salary",
          type: "income",
          icon: "cash",
          color: "#22c55e",
          userId: "user-1",
          createdAt: "",
          updatedAt: "",
        }}
        title="Edit Category"
        submitLabel="Update"
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit Category" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Salary");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows the existing name during edit and submits the updated values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <CategoryFormDrawer
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        initialValues={{
          id: "food",
          name: "Groceries",
          type: "expense",
          icon: "cart",
          color: "#22c55e",
          userId: "user-1",
          createdAt: "",
          updatedAt: "",
        }}
        title="Edit Category"
        submitLabel="Update"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      name: "Groceries",
      type: "expense",
      icon: "cart",
      color: "#22c55e",
    }));
  });
});
