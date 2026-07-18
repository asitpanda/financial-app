import api from './client';

export const getFinancialAccounts = async () => {
  const { data } = await api.get('/financial-accounts');
  return data;
};

export const getFinancialAccountById = async (id) => {
  const { data } = await api.get(`/financial-accounts/${id}`);
  return data;
};

export const createFinancialAccount = async (payload) => {
  const { data } = await api.post('/financial-accounts', payload);
  return data;
};

export const updateFinancialAccount = async (id, payload) => {
  const { data } = await api.patch(`/financial-accounts/${id}`, payload);
  return data;
};

export const deleteFinancialAccount = async (id) => {
  const { data } = await api.delete(`/financial-accounts/${id}`);
  return data;
};
