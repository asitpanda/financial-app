import apiClient from '../../../api/client';
import type { InvestmentEvent } from '../types/investment.types';

export const getInvestmentEvents = async (): Promise<InvestmentEvent[]> => {
  const response = await apiClient.get('/investment-events');
  return Array.isArray(response.data) ? response.data : [];
};

export const getInvestmentEventsByInvestmentId = async (
  investmentId: string | number,
): Promise<InvestmentEvent[]> => {
  const response = await apiClient.get(`/investments/${investmentId}/events`);
  return Array.isArray(response.data) ? response.data : [];
};

export const createInvestmentEvent = async (
  investmentId: string | number,
  payload: Record<string, unknown>,
): Promise<InvestmentEvent> => {
  const response = await apiClient.post(`/investments/${investmentId}/events`, payload);
  return response.data;
};

export const updateInvestmentEvent = async (
  investmentId: string | number,
  eventId: string | number,
  payload: Record<string, unknown>,
): Promise<InvestmentEvent> => {
  const response = await apiClient.patch(`/investments/${investmentId}/events/${eventId}`, payload);
  return response.data;
};

export const deleteInvestmentEvent = async (
  investmentId: string | number,
  eventId: string | number,
): Promise<void> => {
  await apiClient.delete(`/investments/${investmentId}/events/${eventId}`);
};

export const investmentEventsApi = {
  getAll: getInvestmentEvents,
  getByInvestmentId: getInvestmentEventsByInvestmentId,
  create: createInvestmentEvent,
  update: updateInvestmentEvent,
  delete: deleteInvestmentEvent,
};

export default investmentEventsApi;