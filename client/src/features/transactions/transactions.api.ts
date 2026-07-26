import apiClient from "../../api/client";
import type {
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
} from "./transaction.types";

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await apiClient.get("/transactions");
  return response.data;
};

const getTransactionById = async (id: string): Promise<Transaction> => {
  const response = await apiClient.get(`/transactions/${id}`);
  return response.data;
};

const createTransaction = async (
  data: CreateTransactionDto,
): Promise<Transaction> => {
  const response = await apiClient.post("/transactions", data);
  return response.data;
};

const updateTransaction = async (
  id: string,
  data: UpdateTransactionDto,
): Promise<Transaction> => {
  const response = await apiClient.patch(`/transactions/${id}`, data);
  return response.data;
};

const deleteTransaction = async (id: string): Promise<void> => {
  await apiClient.delete(`/transactions/${id}`);
};

export const transactionApi = {
  getAll: getTransactions,

  getById: getTransactionById,

  create: createTransaction,

  update: updateTransaction,

  delete: deleteTransaction,

  getByType: async (type: "income" | "expense"): Promise<Transaction[]> => {
    const response = await apiClient.get(`/transactions?type=${type}`);
    return response.data;
  },

  getByDateRange: async (
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> => {
    const response = await apiClient.get(
      `/transactions/date-range?startDate=${startDate}&endDate=${endDate}`,
    );
    return response.data;
  },
};

export default transactionApi;
