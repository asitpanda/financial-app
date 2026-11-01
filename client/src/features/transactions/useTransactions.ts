import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import transactionApi from "./transactions.api";
import { saveTransaction } from "./transactions.service";
import { getCategories } from "../categories/categories.api";
import { getGoals } from "../goals/goals.api";
import { getFinancialAccounts } from "../accounts/financialAccounts.api";
import type { FinancialAccountRecord } from "../accounts/types/account.types";
import { useNotificationStore } from "../../store/notificationStore";
import type { Goal } from "../../types";
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionRecord,
  TransactionListQuery,
  TransactionListResponse,
  TransactionPageSummary,
  TransactionSavePayload,
} from "./transaction.types";

const toApplicationTransactionModel = (
  responseDto: TransactionRecord,
): TransactionRecord => {
  return {
    ...responseDto,
    category:
      responseDto.category || responseDto.categoryLabelSnapshot || "",
    source:
      responseDto.source ||
      (responseDto.sourceAccountId != null
        ? String(responseDto.sourceAccountId)
        : ""),
  };
};

interface TransactionGoalRecord extends Goal {
  _id?: string;
}

interface TransactionReferenceData {
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense" | "goal";
  }>;
  goals: TransactionGoalRecord[];
  accounts: FinancialAccountRecord[];
}

const emptyPageSummary: TransactionPageSummary = {
  totalIncome: 0,
  totalExpense: 0,
  net: 0,
  transactionCount: 0,
  openingBalance: null,
  moneyIn: null,
  moneyOut: null,
  closingBalance: null,
  multiCurrency: false,
};

export const useTransactions = () => {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionApi.getAll(),
  });
};

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: () => transactionApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionDto) => transactionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionDto }) =>
      transactionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useSaveTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      selectedTransaction,
    }: {
      payload: TransactionSavePayload;
      selectedTransaction?: TransactionRecord | null;
    }) => saveTransaction({ payload, selectedTransaction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useRemoveTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
};

export const useTransactionsByType = (type: TransactionRecord["type"]) => {
  return useQuery({
    queryKey: ["transactions", "type", type],
    queryFn: () => transactionApi.getByType(type),
  });
};

export const useTransactionsByDateRange = (
  startDate: string,
  endDate: string,
) => {
  return useQuery({
    queryKey: ["transactions", "dateRange", startDate, endDate],
    queryFn: () => transactionApi.getByDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
};

export const useTransactionPageData = (
  hasPrefetched: boolean,
  prefetchedTransactions: TransactionRecord[] = [],
  listQuery: TransactionListQuery = { page: 1, limit: 25 },
) => {
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );

  const referenceQuery = useQuery<TransactionReferenceData>({
    queryKey: ["transactions", "reference-data"],
    queryFn: async () => {
      const [cs, gs, ac] = await Promise.all([
        getCategories(),
        getGoals(),
        getFinancialAccounts(),
      ]);

      return {
        categories: Array.isArray(cs) ? cs : [],
        goals: Array.isArray(gs) ? gs : [],
        accounts: Array.isArray(ac) ? ac : [],
      };
    },
  });

  const listQueryResult = useQuery<TransactionListResponse>({
    queryKey: ["transactions", "list", listQuery],
    queryFn: () => transactionApi.getPage(listQuery),
    initialData: hasPrefetched
      ? {
          data: prefetchedTransactions.map(toApplicationTransactionModel) as TransactionListResponse["data"],
          pagination: {
            page: listQuery.page,
            limit: listQuery.limit,
            total: prefetchedTransactions.length,
            totalPages: Math.ceil(prefetchedTransactions.length / listQuery.limit),
            hasNextPage: false,
          },
          summary: emptyPageSummary,
        }
      : undefined,
  });

  useEffect(() => {
    if (!referenceQuery.error && !listQueryResult.error) return;
    pushNotification({ type: "error", message: "Failed to load transactions" });
  }, [referenceQuery.error, listQueryResult.error, pushNotification]);

  const reload = async () => {
    await Promise.all([referenceQuery.refetch(), listQueryResult.refetch()]);
  };

  return {
    transactions: listQueryResult.data?.data || [],
    pagination: listQueryResult.data?.pagination,
    summary: listQueryResult.data?.summary || emptyPageSummary,
    categories: referenceQuery.data?.categories || [],
    goals: referenceQuery.data?.goals || [],
    accounts: referenceQuery.data?.accounts || [],
    loading: listQueryResult.isLoading || referenceQuery.isLoading,
    error: referenceQuery.error || listQueryResult.error,
    reload,
  };
};
