import api from "./client";

export const getInvestments = async () => {
  const { data } = await api.get("/investments");
  return data;
};

export const getInvestmentById = async (id) => {
  const { data } = await api.get(`/investments/${id}`);
  return data;
};

export const createInvestment = async (payload) => {
  const { data } = await api.post("/investments", payload);
  return data;
};

export const updateInvestment = async (id, payload) => {
  const { data } = await api.patch(`/investments/${id}`, payload);
  return data;
};

export const deleteInvestment = async (id) => {
  const { data } = await api.delete(`/investments/${id}`);
  return data;
};