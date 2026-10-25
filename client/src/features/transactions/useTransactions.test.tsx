import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import transactionApi from "./transactions.api";
import {
  useCreateTransaction,
  useRemoveTransaction,
  useTransaction,
  useTransactions,
  useTransactionsByDateRange,
  useTransactionsByType,
  useUpdateTransaction,
} from "./useTransactions";

const createWrapper = (queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})) => function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

afterEach(() => vi.restoreAllMocks());

describe("useTransactions", () => {
  it("loads transactions and applies type and date-range query keys", async () => {
    const data = [{ id: "transaction-1" }];
    const getAll = vi.spyOn(transactionApi, "getAll").mockResolvedValue(data as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const all = renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => expect(all.result.current.data).toEqual(data));
    expect(getAll).toHaveBeenCalledTimes(1);
  });
});

describe("useTransactionsByType", () => {
  it("loads transactions for the requested type", async () => {
    const data = [{ id: "transaction-1" }];
    const getByType = vi.spyOn(transactionApi, "getByType").mockResolvedValue(data as never);
    const { result } = renderHook(() => useTransactionsByType("EXPENSE"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(data));
    expect(getByType).toHaveBeenCalledWith("EXPENSE");
  });
});

describe("useTransactionsByDateRange", () => {
  it("loads transactions for the requested date range", async () => {
    const data = [{ id: "transaction-1" }];
    const getByDateRange = vi.spyOn(transactionApi, "getByDateRange").mockResolvedValue(data as never);
    const { result } = renderHook(
      () => useTransactionsByDateRange("2026-01-01", "2026-01-31"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data).toEqual(data));
    expect(getByDateRange).toHaveBeenCalledWith("2026-01-01", "2026-01-31");
  });

  it("does not fetch an individual transaction or date range without an id", async () => {
    const getByDateRange = vi.spyOn(transactionApi, "getByDateRange");
    const wrapper = createWrapper();

    const dateRange = renderHook(() => useTransactionsByDateRange("", "2026-01-31"), { wrapper });

    await waitFor(() => expect(dateRange.result.current.fetchStatus).toBe("idle"));
    expect(getByDateRange).not.toHaveBeenCalled();
  });
});

describe("useTransaction", () => {
  it("does not fetch an individual transaction without an id", async () => {
    const getById = vi.spyOn(transactionApi, "getById");
    const { result } = renderHook(() => useTransaction(""), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(getById).not.toHaveBeenCalled();
  });
});

describe("useCreateTransaction", () => {
  it("invalidates transactions and dashboard data after mutations", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(transactionApi, "create").mockResolvedValue({ id: "created" } as never);
    const wrapper = createWrapper(queryClient);

    const create = renderHook(() => useCreateTransaction(), { wrapper });
    await act(async () => {
      await create.result.current.mutateAsync({ type: "INCOME", amount: 10, date: "2026-01-01" });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });
});

describe("useUpdateTransaction", () => {
  it("invalidates transactions and dashboard data after updating", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const update = vi.spyOn(transactionApi, "update").mockResolvedValue({ id: "updated" } as never);
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync({ id: "transaction-1", data: { amount: 20 } });
    });

    expect(update).toHaveBeenCalledWith("transaction-1", { amount: 20 });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });
});

describe("useRemoveTransaction", () => {
  it("invalidates transactions and dashboard data after removing", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const remove = vi.spyOn(transactionApi, "delete").mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveTransaction(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync("transaction-1");
    });

    expect(remove).toHaveBeenCalledWith("transaction-1");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });
});