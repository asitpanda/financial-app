import apiClient from '../../api/client';

export const getFinancialAccounts = async (): Promise<any[]> => {
  const response = await apiClient.get('/financial-accounts');
  return response.data;
};

export const getFinancialAccountById = async (id: string): Promise<any> => {
  const response = await apiClient.get(`/financial-accounts/${id}`);
  return response.data;
};

export const createFinancialAccount = async (payload: any): Promise<any> => {
  const response = await apiClient.post('/financial-accounts', payload);
  return response.data;
};

export const updateFinancialAccount = async (id: string, payload: any): Promise<any> => {
  const response = await apiClient.patch(`/financial-accounts/${id}`, payload);
  return response.data;
};

export const deleteFinancialAccount = async (id: string): Promise<void> => {
  await apiClient.delete(`/financial-accounts/${id}`);
};

export const financialAccountsApi = {
  getAll: getFinancialAccounts,
  getById: getFinancialAccountById,
  create: createFinancialAccount,
  update: updateFinancialAccount,
  delete: deleteFinancialAccount,
};

export default financialAccountsApi;
