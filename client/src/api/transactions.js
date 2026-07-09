import api from "./client";

export const getTransactions = async () => {
  const { data } = await api.get("/transactions");
  return data;
};

export const getTransactionSources = async () => {
  const { data } = await api.get("/transactions/sources");
  return data;
};

export const createTransaction = async (payload) => {
  const { data } = await api.post("/transactions", payload);
  return data;
};

export const updateTransaction = async (id, payload) => {
  const { data } = await api.patch(`/transactions/${id}`, payload);
  return data;
};

export const deleteTransaction = async (id) => {
  const { data } = await api.delete(`/transactions/${id}`);
  return data;
};
