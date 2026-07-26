import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import categoryApi from "./categories.api";
import { saveCategory, removeCategory } from "./categories.service";
import transactionApi from "../transactions/transactions.api";
import { useNotificationStore } from "../../store/notificationStore";
import type {
  CategoryRecord,
  CategorySavePayload,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "./categories.types";
import type { TransactionRecord } from "../transactions/transaction.types";

interface CategoryPageData {
  categories: CategoryRecord[];
  transactions: TransactionRecord[];
}

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getAll(),
  });
};

export const useCategory = (id: string) => {
  return useQuery({
    queryKey: ["category", id],
    queryFn: () => categoryApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryDto) => categoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", "page-data"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDto }) =>
      categoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", "page-data"] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", "page-data"] });
    },
  });
};

export const useSaveCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      selectedCategory,
    }: {
      payload: CategorySavePayload;
      selectedCategory?: CategoryRecord | null;
    }) => saveCategory({ payload, selectedCategory }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", "page-data"] });
    },
  });
};

export const useRemoveCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories", "page-data"] });
    },
  });
};

export const useCategoryPageData = () => {
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );

  const query = useQuery<CategoryPageData>({
    queryKey: ["categories", "page-data"],
    queryFn: async () => {
      const [categories, transactions] = await Promise.all([
        categoryApi.getAll(),
        transactionApi.getAll(),
      ]);

      return {
        categories: Array.isArray(categories) ? categories : [],
        transactions: Array.isArray(transactions) ? transactions : [],
      };
    },
  });

  useEffect(() => {
    if (!query.error) return;
    pushNotification({ type: "error", message: "Failed to load categories" });
  }, [query.error, pushNotification]);

  return {
    categories: query.data?.categories || [],
    transactions: query.data?.transactions || [],
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
};
