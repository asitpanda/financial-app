import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import transactionApi from "./transactions.api";
import * as categoriesApi from "../categories/categories.api";
import * as goalsApi from "../goals/goals.api";
import * as financialAccountsApi from "../accounts/financialAccounts.api";
import { useNotificationStore } from "../../store/notificationStore";
import * as transactionService from "./transactions.service";
import type { TransactionRecord } from "./transaction.types";
import {
  useCreateTransaction,
  useRemoveTransaction,
  useSaveTransaction,
  useTransaction,
  useTransactionPageData,
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

afterEach(() => {
  vi.restoreAllMocks();
  useNotificationStore.getState().clearNotifications();
});

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

    it("does not fetch a date range until both dates are available", async () => {
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

  describe("useSaveTransaction", () => {
    it("saves the transaction and invalidates transaction and dashboard data", async () => {
      const queryClient = new QueryClient();
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
      const save = vi.spyOn(transactionService, "saveTransaction")
        .mockResolvedValue({ id: "created" } as never);
      const { result } = renderHook(() => useSaveTransaction(), { wrapper: createWrapper(queryClient) });
      const payload = { type: "EXPENSE" as const, amount: 20, date: "2026-01-01" };

      await act(async () => {
        await result.current.mutateAsync({ payload, selectedTransaction: null });
      });

      expect(save).toHaveBeenCalledExactlyOnceWith({ payload, selectedTransaction: null });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    });
  });

  describe("useTransactionPageData", () => {
    it("normalizes prefetched rows and loads reference data without fetching the page again", async () => {
      const prefetchedTransaction: TransactionRecord = {
        id: "transaction-1",
        type: "EXPENSE",
        amount: 25,
        categoryLabelSnapshot: "Groceries",
        sourceAccountId: 7,
        date: "2026-01-15",
        userId: "user-1",
        createdAt: "2026-01-15T00:00:00.000Z",
        updatedAt: "2026-01-15T00:00:00.000Z",
      };
      const pageQuery = { page: 2, limit: 10, type: "EXPENSE" as const };
      const categories = [{ id: "food", name: "Food", type: "expense" }];
      const goals = [{ id: "goal-1", name: "Trip" }];
      const accounts = [{ id: 7, name: "Checking", currency: "USD" }];
      const getPage = vi.spyOn(transactionApi, "getPage");
      vi.spyOn(categoriesApi, "getCategories")
        .mockResolvedValue(categories as never);
      vi.spyOn(goalsApi, "getGoals")
        .mockResolvedValue(goals as never);
      vi.spyOn(financialAccountsApi, "getFinancialAccounts")
        .mockResolvedValue(accounts as never);
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      const { result } = renderHook(
        () => useTransactionPageData(true, [prefetchedTransaction], pageQuery),
        { wrapper: createWrapper(queryClient) },
      );

      await waitFor(() => expect(result.current.accounts).toEqual(accounts));

      expect(result.current.transactions).toEqual([
        expect.objectContaining({ category: "Groceries", source: "7" }),
      ]);
      expect(result.current.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      });
      expect(result.current.categories).toEqual(categories);
      expect(result.current.goals).toEqual(goals);
      expect(getPage).not.toHaveBeenCalled();
    });

    it("loads the requested page and reloads it with reference data", async () => {
      const pageQuery = { page: 3, limit: 50, search: "coffee" };
      const pageResponse = {
        data: [{ id: "transaction-1" }],
        pagination: { page: 3, limit: 50, total: 1, totalPages: 1, hasNextPage: false },
        summary: {
          totalIncome: 0,
          totalExpense: 15,
          net: -15,
          transactionCount: 1,
          openingBalance: null,
          moneyIn: null,
          moneyOut: null,
          closingBalance: null,
          multiCurrency: false,
        },
      };
      const getPage = vi.spyOn(transactionApi, "getPage").mockResolvedValue(pageResponse as never);
      const loadCategories = vi.spyOn(categoriesApi, "getCategories")
        .mockResolvedValue([]);
      const loadGoals = vi.spyOn(goalsApi, "getGoals")
        .mockResolvedValue([]);
      const loadAccounts = vi.spyOn(financialAccountsApi, "getFinancialAccounts")
        .mockResolvedValue([]);
      const { result } = renderHook(
        () => useTransactionPageData(false, [], pageQuery),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.transactions).toEqual(pageResponse.data));
      expect(getPage).toHaveBeenCalledExactlyOnceWith(pageQuery);

      await act(async () => {
        await result.current.reload();
      });

      expect(getPage).toHaveBeenCalledTimes(2);
      expect(loadCategories).toHaveBeenCalledTimes(2);
      expect(loadGoals).toHaveBeenCalledTimes(2);
      expect(loadAccounts).toHaveBeenCalledTimes(2);
      expect(result.current.summary).toEqual(pageResponse.summary);
    });

    it("returns empty reference lists when an API response is not an array", async () => {
      vi.spyOn(transactionApi, "getPage").mockResolvedValue({ data: [], pagination: {}, summary: {} } as never);
      vi.spyOn(categoriesApi, "getCategories")
        .mockResolvedValue(null as never);
      vi.spyOn(goalsApi, "getGoals")
        .mockResolvedValue(null as never);
      vi.spyOn(financialAccountsApi, "getFinancialAccounts")
        .mockResolvedValue(null as never);
      const { result } = renderHook(
        () => useTransactionPageData(false),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.categories).toEqual([]);
      expect(result.current.goals).toEqual([]);
      expect(result.current.accounts).toEqual([]);
    });

    it.each(["reference data", "transaction list"] as const)(
      "notifies when %s fails to load",
      async (failedQuery) => {
        const offlineError = new Error("Offline");
        vi.spyOn(categoriesApi, "getCategories")
          .mockImplementation(() => failedQuery === "reference data" ? Promise.reject(offlineError) : Promise.resolve([]));
        vi.spyOn(goalsApi, "getGoals").mockResolvedValue([]);
        vi.spyOn(financialAccountsApi, "getFinancialAccounts")
          .mockResolvedValue([]);
        vi.spyOn(transactionApi, "getPage")
          .mockImplementation(() => failedQuery === "transaction list" ? Promise.reject(offlineError) : Promise.resolve({ data: [], pagination: {}, summary: {} } as never));
        const { result } = renderHook(
          () => useTransactionPageData(false),
          { wrapper: createWrapper() },
        );

        await waitFor(() => {
          expect(useNotificationStore.getState().notifications).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ type: "error", message: "Failed to load transactions" }),
            ]),
          );
        });
        expect(result.current.error).toBe(offlineError);
      },
    );
  });
});