import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import goalApi from "./goals.api";
import transactionApi from "../transactions/transactions.api";
import { useNotificationStore } from "../../store/notificationStore";
import { removeGoal, saveGoal } from "./goals.service";
import type {
  CreateGoalDto,
  GoalRecord,
  GoalSavePayload,
  UpdateGoalDto,
} from "./goal.types";
import type { TransactionRecord } from "../transactions/transaction.types";

interface GoalPageData {
  goals: GoalRecord[];
  transactions: TransactionRecord[];
}

export const useGoals = () => {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => goalApi.getAll(),
  });
};

export const useGoal = (id: string) => {
  return useQuery({
    queryKey: ["goal", id],
    queryFn: () => goalApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGoalDto) => goalApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", "page-data"] });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalDto }) =>
      goalApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", "page-data"] });
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goalApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", "page-data"] });
    },
  });
};

export const useSaveGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      selectedGoal,
    }: {
      payload: GoalSavePayload;
      selectedGoal?: GoalRecord | null;
    }) => saveGoal({ payload, selectedGoal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", "page-data"] });
    },
  });
};

export const useRemoveGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", "page-data"] });
    },
  });
};

export const useGoalPageData = () => {
  const pushNotification = useNotificationStore(
    (state) => state.pushNotification,
  );

  const query = useQuery<GoalPageData>({
    queryKey: ["goals", "page-data"],
    queryFn: async () => {
      const [goals, transactions] = await Promise.all([
        goalApi.getAll(),
        transactionApi.getAll(),
      ]);

      return {
        goals: Array.isArray(goals) ? goals : [],
        transactions: Array.isArray(transactions) ? transactions : [],
      };
    },
  });

  useEffect(() => {
    if (!query.error) return;
    pushNotification({ type: "error", message: "Failed to load goals" });
  }, [query.error, pushNotification]);

  return {
    goals: query.data?.goals || [],
    transactions: query.data?.transactions || [],
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
};
