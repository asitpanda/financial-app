import apiClient from './client';

export const getInvestments = async () => {
  const response = await apiClient.get('/investments');
  return response.data;
};

export const getInvestmentById = async (id) => {
  const response = await apiClient.get(`/investments/${id}`);
  return response.data;
};

export const createInvestment = async (data) => {
  const response = await apiClient.post('/investments', data);
  return response.data;
};

export const updateInvestment = async (id, data) => {
  const response = await apiClient.patch(`/investments/${id}`, data);
  return response.data;
};

export const deleteInvestment = async (id) => {
  await apiClient.delete(`/investments/${id}`);
};

export const investmentApi = {
  getAll: getInvestments,
  getById: getInvestmentById,
  create: createInvestment,
  update: updateInvestment,
  delete: deleteInvestment,
};

export default investmentApi;