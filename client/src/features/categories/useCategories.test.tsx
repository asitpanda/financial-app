import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import categoryApi from "./categories.api";
import transactionApi from "../transactions/transactions.api";
import { useNotificationStore } from "../../store/notificationStore";
import {
  useCategory,
  useCategoryPageData,
  useCreateCategory,
  useDeleteCategory,
  useRemoveCategory,
  useSaveCategory,
  useUpdateCategory,
} from "./useCategories";

const createWrapper = (queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

afterEach(() => vi.restoreAllMocks());

describe("category hooks", () => {
  it("loads both page data sources and normalizes malformed responses", async () => {
    vi.spyOn(categoryApi, "getAll").mockResolvedValue(null as never);
    vi.spyOn(transactionApi, "getAll").mockResolvedValue([] as never);

    const { result } = renderHook(() => useCategoryPageData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.categories).toEqual([]);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("exposes query failures and sends an error notification", async () => {
    const failure = new Error("Network unavailable");
    vi.spyOn(categoryApi, "getAll").mockRejectedValue(failure);
    vi.spyOn(transactionApi, "getAll").mockResolvedValue([] as never);
    const pushNotification = vi.spyOn(
      useNotificationStore.getState(),
      "pushNotification",
    );

    const { result } = renderHook(() => useCategoryPageData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe(failure));
    await waitFor(() =>
      expect(pushNotification).toHaveBeenCalledWith({
        type: "error",
        message: "Failed to load categories",
      }),
    );
    expect(result.current.categories).toEqual([]);
  });

  it("retries page data on refetch after an initial failure", async () => {
    const categories = [
      {
        id: "food",
        name: "Food",
        type: "expense",
        userId: "user-1",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const getCategories = vi
      .spyOn(categoryApi, "getAll")
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce(categories as never);
    vi.spyOn(transactionApi, "getAll").mockResolvedValue([] as never);

    const { result } = renderHook(() => useCategoryPageData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    await act(async () => {
      await result.current.reload();
    });

    expect(getCategories).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(result.current.categories).toEqual(categories);
      expect(result.current.error).toBeNull();
    });
  });

  it("saves a new category and invalidates all dependent queries", async () => {
    const created = { id: "food", name: "Food", type: "expense" };
    const create = vi.spyOn(categoryApi, "create").mockResolvedValue(created as never);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSaveCategory(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        payload: { name: " Food ", type: "expense", icon: "cart" },
      });
    });

    expect(create).toHaveBeenCalledWith({
      name: "Food",
      type: "expense",
      icon: "cart",
      color: undefined,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["categories"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["categories", "page-data"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard"],
    });
  });

  it("covers direct create, update, delete, and remove mutation contracts", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const create = vi.spyOn(categoryApi, "create").mockResolvedValue({ id: "new" } as never);
    const update = vi.spyOn(categoryApi, "update").mockResolvedValue({ id: "updated" } as never);
    const remove = vi.spyOn(categoryApi, "delete").mockResolvedValue(undefined);
    const wrapper = createWrapper(queryClient);

    const createHook = renderHook(() => useCreateCategory(), { wrapper });
    await act(async () => {
      await createHook.result.current.mutateAsync({ name: "Food", type: "expense" });
    });
    const updateHook = renderHook(() => useUpdateCategory(), { wrapper });
    await act(async () => {
      await updateHook.result.current.mutateAsync({ id: "new", data: { name: "Groceries", type: "expense" } });
    });
    const deleteHook = renderHook(() => useDeleteCategory(), { wrapper });
    await act(async () => {
      await deleteHook.result.current.mutateAsync("new");
    });
    const removeHook = renderHook(() => useRemoveCategory(), { wrapper });
    await act(async () => {
      await removeHook.result.current.mutateAsync("new");
    });

    expect(create).toHaveBeenCalledWith({ name: "Food", type: "expense" });
    expect(update).toHaveBeenCalledWith("new", { name: "Groceries", type: "expense" });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["categories", "page-data"] });
  });

  it("does not fetch an individual category when its ID is missing", async () => {
    const getById = vi.spyOn(categoryApi, "getById");
    const { result } = renderHook(() => useCategory(""), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(getById).not.toHaveBeenCalled();
  });
});
