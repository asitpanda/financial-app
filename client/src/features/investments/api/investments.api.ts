import apiClient from '../../../api/client';
import type {
  CreateInvestmentDto,
  Investment,
  UpdateInvestmentDto,
} from '../types/investment.types';

export const getInvestments = async (): Promise<Investment[]> => {
  const response = await apiClient.get('/investments');
  return response.data;
};

export const getInvestmentById = async (
  id: string | number,
): Promise<Investment> => {
  const response = await apiClient.get(`/investments/${id}`);
  return response.data;
};

export const createInvestment = async (
  data: CreateInvestmentDto,
): Promise<Investment> => {
  const response = await apiClient.post('/investments', data);
  return response.data;
};

export const updateInvestment = async (
  id: string | number,
  data: UpdateInvestmentDto,
): Promise<Investment> => {
  const { id: _ignoredId, ...payload } = (data || {}) as UpdateInvestmentDto & {
    id?: string | number;
  };
  const response = await apiClient.patch(`/investments/${id}`, payload);
  return response.data;
};

export const deleteInvestment = async (id: string | number): Promise<void> => {
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