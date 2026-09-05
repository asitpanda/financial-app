import apiClient from '../../../api/client';
import type { InvestmentBenefit } from '../types/investment.types';

export type InvestmentBenefitPayload = {
  benefitType: InvestmentBenefit['benefitType'];
  amount: number;
  benefitDate: string;
  notes?: string;
  status?: InvestmentBenefit['status'];
};

const toBenefits = (data: unknown): InvestmentBenefit[] => (Array.isArray(data) ? data : []);

export const getInvestmentBenefits = async (): Promise<InvestmentBenefit[]> => {
  const response = await apiClient.get('/investment-benefits');
  return toBenefits(response.data);
};

export const getInvestmentBenefitsByInvestmentId = async (
  investmentId: string | number,
): Promise<InvestmentBenefit[]> => {
  const response = await apiClient.get(`/investments/${investmentId}/benefits`);
  return toBenefits(response.data);
};

export const getInvestmentBenefit = async (
  investmentId: string | number,
  benefitId: string | number,
): Promise<InvestmentBenefit> => {
  const response = await apiClient.get(`/investments/${investmentId}/benefits/${benefitId}`);
  return response.data;
};

export const createInvestmentBenefit = async (
  investmentId: string | number,
  payload: InvestmentBenefitPayload,
): Promise<InvestmentBenefit> => {
  const response = await apiClient.post(`/investments/${investmentId}/benefits`, payload);
  return response.data;
};

export const updateInvestmentBenefit = async (
  investmentId: string | number,
  benefitId: string | number,
  payload: Partial<InvestmentBenefitPayload>,
): Promise<InvestmentBenefit> => {
  const response = await apiClient.patch(
    `/investments/${investmentId}/benefits/${benefitId}`,
    payload,
  );
  return response.data;
};

export const deleteInvestmentBenefit = async (
  investmentId: string | number,
  benefitId: string | number,
): Promise<void> => {
  await apiClient.delete(`/investments/${investmentId}/benefits/${benefitId}`);
};

export type BenefitRealizationComponent = {
  eventType: string;
  amount: number;
  eventDate?: string;
  notes?: string;
  transaction?: {
    type?: string;
    sourceAccountId?: number;
    destinationAccountId?: number;
    categoryId?: number;
    goalId?: number;
    notes?: string;
  };
};

export type RealizeInvestmentBenefitPayload = {
  components: BenefitRealizationComponent[];
  closesInvestment?: boolean;
};

export type QuickRealizeInvestmentBenefitPayload = BenefitRealizationComponent & {
  benefitType: InvestmentBenefit['benefitType'];
  benefitDate?: string;
  benefitNotes?: string;
  closesInvestment?: boolean;
};

export const realizeInvestmentBenefit = async (
  investmentId: string | number,
  benefitId: string | number,
  payload: RealizeInvestmentBenefitPayload,
): Promise<{ benefit: InvestmentBenefit; events: any[] }> => {
  const response = await apiClient.post(
    `/investments/${investmentId}/benefits/${benefitId}/realize`,
    payload,
  );
  return response.data;
};

export const quickRealizeInvestmentBenefit = async (
  investmentId: string | number,
  payload: QuickRealizeInvestmentBenefitPayload,
): Promise<{ benefit: InvestmentBenefit; events: any[] }> => {
  const response = await apiClient.post(
    `/investments/${investmentId}/benefits/quick-realize`,
    payload,
  );
  return response.data;
};

export const investmentBenefitsApi = {
  getAll: getInvestmentBenefits,
  getByInvestmentId: getInvestmentBenefitsByInvestmentId,
  getById: getInvestmentBenefit,
  create: createInvestmentBenefit,
  update: updateInvestmentBenefit,
  delete: deleteInvestmentBenefit,
  realize: realizeInvestmentBenefit,
  quickRealize: quickRealizeInvestmentBenefit,
};

export default investmentBenefitsApi;