import apiClient from '../../../api/client';
import type { InvestmentEvent } from '../types/investment.types';

export const getInvestmentEventsByInvestmentId = async (
  investmentId: string | number,
): Promise<InvestmentEvent[]> => {
  const response = await apiClient.get(`/investment-events/investment/${investmentId}`);
  return Array.isArray(response.data) ? response.data : [];
};

export const investmentEventsApi = {
  getByInvestmentId: getInvestmentEventsByInvestmentId,
};

export default investmentEventsApi;