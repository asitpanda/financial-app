import { screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/test-utils";
import Categories from "./Categories";
import { useDialogStore } from "../../store/dialogStore";
import { useDrawerStore } from "../../store/drawerStore";
import { useNotificationStore } from "../../store/notificationStore";
import type { CategoryRecord } from "./categories.types";

const mocks = vi.hoisted(() => ({
  pageData: {
    categories: [] as CategoryRecord[],
    transactions: [] as never[],
    loading: false,
    error: null as Error | null,
    reload: vi.fn(),
  },
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("./useCategories", () => ({
  useCategoryPageData: () => mocks.pageData,
  useSaveCategory: () => ({ mutateAsync: mocks.save }),
  useRemoveCategory: () => ({ mutateAsync: mocks.remove }),
}));

vi.mock("./components/CategoriesFormDrawer", () => ({
  default: ({ open, onClose, onSubmit, title }: {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: { name: string; type: "expense" }) => Promise<string | undefined>;
    title: string;
  }) => open ? (
    <section aria-label="Category form drawer">
      <h2>{title}</h2>
      <button type="button" onClick={() => void onSubmit({ name: "Food", type: "expense" })}>
        Submit category
      </button>
      <button type="button" onClick={onClose}>Close category drawer</button>
    </section>
  ) : null,
}));

vi.mock("../../components/dialogs", () => ({
  ConfirmDialog: ({ open, onCancel, onConfirm }: {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  }) => open ? (
    <section aria-label="Delete category dialog">
      <button type="button" onClick={onCancel}>Cancel deletion</button>
      <button type="button" onClick={onConfirm}>Confirm deletion</button>
    </section>
  ) : null,
}));

vi.mock("../../components/common/DataTable", () => ({
  default: ({ rows, columns }: {
    rows: Array<{ id: string; name: string; category: CategoryRecord }>;
    columns: Array<{ field: string; renderCell?: (params: { row: typeof rows[number] }) => ReactNode }>;
  }) => {
    const actionColumn = columns.find((column) => column.field === "actions");
    return (
      <div role="table">
        {rows.map((row) => (
          <div role="row" key={row.id}>
            <span>{row.name}</span>
            {actionColumn?.renderCell?.({ row })}
          </div>
        ))}
      </div>
    );
  },
}));

const category: CategoryRecord = {
  id: "category-1",
  name: "Food",
  type: "expense",
  userId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const resetStores = () => {
  useDrawerStore.getState().closeDrawer();
  useDialogStore.getState().closeDialog();
};

describe("Categories page", () => {
  beforeEach(() => {
    mocks.pageData.categories = [];
    mocks.pageData.transactions = [];
    mocks.pageData.loading = false;
    mocks.pageData.error = null;
    mocks.pageData.reload.mockReset();
    mocks.save.mockReset();
    mocks.remove.mockReset();
    resetStores();
  });

  afterEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it("shows loading state while categories are being fetched", () => {
    mocks.pageData.loading = true;
    mocks.pageData.categories = [category];

    renderWithProviders(<Categories />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows the first-use empty state and opens the add drawer", async () => {
    const user = userEvent.setup();

    renderWithProviders(<Categories />);

    await user.click(screen.getByRole("button", { name: "Add Category" }));

    expect(screen.getByRole("heading", { name: "Add Category" })).toBeInTheDocument();
    expect(useDrawerStore.getState()).toMatchObject({
      open: true,
      type: "category",
      mode: "create",
      step: "form",
    });
  });

  it("shows a load error and retries through the page reload action", async () => {
    mocks.pageData.categories = [category];
    mocks.pageData.error = new Error("Network unavailable");

    renderWithProviders(<Categories />);

    expect(screen.getByText("Failed to load categories")).toBeInTheDocument();
  });

  it("opens edit and delete actions for the selected category", async () => {
    const user = userEvent.setup();
    mocks.pageData.categories = [category];

    renderWithProviders(<Categories />);

    await user.click(screen.getByRole("button", { name: "Edit Food" }));
    expect(screen.getByRole("heading", { name: "Edit Category" })).toBeInTheDocument();
    expect(useDrawerStore.getState()).toMatchObject({ entityId: "category-1", mode: "edit" });

    await user.click(screen.getByRole("button", { name: "Delete Food" }));
    expect(screen.getByRole("button", { name: "Confirm deletion" })).toBeInTheDocument();
    expect(useDialogStore.getState()).toMatchObject({
      open: true,
      type: "confirmDelete",
      payload: { entity: "category", id: "category-1", name: "Food" },
    });
  });

  it("closes the drawer and reloads after a successful save", async () => {
    const user = userEvent.setup();
    mocks.pageData.categories = [category];
    mocks.save.mockResolvedValue(category);
    mocks.pageData.reload.mockResolvedValue(undefined);
    useDrawerStore.getState().openDrawer({ type: "category", mode: "edit", entityId: "category-1", step: "form" });

    renderWithProviders(<Categories />);
    await user.click(screen.getByRole("button", { name: "Submit category" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({
      payload: { name: "Food", type: "expense" },
      selectedCategory: category,
    }));
    expect(mocks.pageData.reload).toHaveBeenCalledOnce();
    expect(useDrawerStore.getState().open).toBe(false);
  });

  it("keeps the drawer open and reports a save failure", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.save.mockRejectedValue(new Error("Duplicate category"));
    useDrawerStore.getState().openDrawer({ type: "category", mode: "create", step: "form" });

    renderWithProviders(<Categories />);
    await user.click(screen.getByRole("button", { name: "Submit category" }));

    await waitFor(() =>
      expect(pushNotification).toHaveBeenCalledWith({
        type: "error",
        message: "Failed to add category",
      }),
    );
    expect(useDrawerStore.getState().open).toBe(true);
    expect(mocks.pageData.reload).not.toHaveBeenCalled();
  });

  it("cancels deletion and reloads after a successful deletion", async () => {
    const user = userEvent.setup();
    mocks.pageData.categories = [category];
    mocks.remove.mockResolvedValue(undefined);
    useDialogStore.getState().openDialog("confirmDelete", {
      entity: "category",
      id: "category-1",
      name: "Food",
    });

    renderWithProviders(<Categories />);
    await user.click(screen.getByRole("button", { name: "Cancel deletion" }));
    expect(useDialogStore.getState().open).toBe(false);

    await user.click(screen.getByRole("button", { name: "Delete Food" }));
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith("category-1"));
    expect(mocks.pageData.reload).toHaveBeenCalledOnce();
    expect(useDialogStore.getState().open).toBe(false);
  });

  it("keeps the delete dialog open and reports a deletion failure", async () => {
    const user = userEvent.setup();
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );
    mocks.pageData.categories = [category];
    mocks.remove.mockRejectedValue(new Error("Category is in use"));

    renderWithProviders(<Categories />);
    await user.click(screen.getByRole("button", { name: "Delete Food" }));
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));

    await waitFor(() =>
      expect(pushNotification).toHaveBeenCalledWith({
        type: "error",
        message: "Failed to delete category",
      }),
    );
    expect(useDialogStore.getState().open).toBe(true);
    expect(mocks.pageData.reload).not.toHaveBeenCalled();
  });
});
