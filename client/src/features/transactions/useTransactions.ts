import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import transactionApi from "./transactions.api";
import { saveTransaction } from "./transactions.service";
import { getCategories } from "../categories/categories.api";
import { getGoals } from "../goals/goals.api";
import { getFinancialAccounts } from "../accounts/financialAccounts.api";
import { useNotificationStore } from "../../store/notificationStore";
import type { Goal } from "../../types";
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionRecord,
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

interface FinancialAccountRecord {
  id: number | string;
  name?: string;
  displayName?: string;
  institutionName?: string;
}

interface TransactionPageData {
  transactions: TransactionRecord[];
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense" | "goal";
  }>;
  goals: TransactionGoalRecord[];
  accounts: FinancialAccountRecord[];
}

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
    },
  });
};

export const useRemoveTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useTransactionsByType = (type: "income" | "expense") => {
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
) => {
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );

  const query = useQuery<TransactionPageData>({
    queryKey: ["transactions", "page-data"],
    queryFn: async () => {
      const [tx, cs, gs, ac] = await Promise.all([
        transactionApi.getAll(),
        getCategories(),
        getGoals(),
        getFinancialAccounts(),
      ]);

      return {
        transactions: Array.isArray(tx)
          ? tx.map((item: TransactionRecord) =>
              toApplicationTransactionModel(item),
            )
          : [],
        categories: Array.isArray(cs) ? cs : [],
        goals: Array.isArray(gs) ? gs : [],
        accounts: Array.isArray(ac) ? ac : [],
      };
    },
    initialData: hasPrefetched
      ? {
          transactions: prefetchedTransactions,
          categories: [],
          goals: [],
          accounts: [],
        }
      : undefined,
  });

  useEffect(() => {
    if (!query.error) return;
    pushNotification({ type: "error", message: "Failed to load transactions" });
  }, [query.error, pushNotification]);

  return {
    transactions: query.data?.transactions || [],
    categories: query.data?.categories || [],
    goals: query.data?.goals || [],
    accounts: query.data?.accounts || [],
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
};
