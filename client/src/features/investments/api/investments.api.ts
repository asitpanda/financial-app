import apiClient from '../../../api/client';
import type {
  CreateInvestmentDto,
  InvestmentDashboardWidgetResponse,
  Investment,
  InvestmentDetailShell,
  InvestmentMetadataResponse,
  InvestmentPerformancePayload,
  UpdateInvestmentDto,
} from '../types/investment.types';

export const getInvestments = async (): Promise<Investment[]> => {
  const response = await apiClient.get('/investments');
  return response.data;
};

export const getInvestmentById = async (
  id: string | number,
): Promise<InvestmentDetailShell> => {
  const response = await apiClient.get(`/investments/${id}`);
  return response.data;
};

export const getInvestmentPerformanceById = async (
  id: string | number,
): Promise<InvestmentPerformancePayload> => {
  const response = await apiClient.get(`/investments/${id}/performance`);
  return response.data;
};

export const getInvestmentDashboardAnalytics = async (): Promise<InvestmentDashboardWidgetResponse> => {
  const response = await apiClient.get('/investments/dashboard');
  return response.data;
};

export const getInvestmentMetadata = async (): Promise<InvestmentMetadataResponse> => {
  const response = await apiClient.get('/investments/metadata');
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
  getPerformanceById: getInvestmentPerformanceById,
  getDashboardAnalytics: getInvestmentDashboardAnalytics,
  getMetadata: getInvestmentMetadata,
  create: createInvestment,
  update: updateInvestment,
  delete: deleteInvestment,
};

export default investmentApi;