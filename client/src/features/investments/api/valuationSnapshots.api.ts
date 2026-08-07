import apiClient from '../../../api/client';
import type { InvestmentValuationSnapshot } from '../types/investment.types';

export interface SaveValuationSnapshotDto {
  investmentId: string | number;
  snapshotDate: string;
  marketValue: number;
  units?: number | null;
  price?: number | null;
  source?: string;
}

export const getValuationSnapshotsByInvestment = async (
  investmentId: string | number,
): Promise<InvestmentValuationSnapshot[]> => {
  const response = await apiClient.get(
    `/valuations/snapshots/investment/${investmentId}`,
  );
  return response.data;
};

export const getValuationSnapshotById = async (
  id: string | number,
): Promise<InvestmentValuationSnapshot> => {
  const response = await apiClient.get(`/valuations/snapshots/${id}`);
  return response.data;
};

export const createValuationSnapshot = async (
  payload: SaveValuationSnapshotDto,
): Promise<InvestmentValuationSnapshot> => {
  const response = await apiClient.post('/valuations/snapshots', payload);
  return response.data;
};

export const updateValuationSnapshot = async (
  id: string | number,
  payload: Partial<SaveValuationSnapshotDto>,
): Promise<InvestmentValuationSnapshot> => {
  const response = await apiClient.put(`/valuations/snapshots/${id}`, payload);
  return response.data;
};

export const deleteValuationSnapshot = async (
  id: string | number,
): Promise<void> => {
  await apiClient.delete(`/valuations/snapshots/${id}`);
};

export const valuationSnapshotsApi = {
  getByInvestment: getValuationSnapshotsByInvestment,
  getById: getValuationSnapshotById,
  create: createValuationSnapshot,
  update: updateValuationSnapshot,
  delete: deleteValuationSnapshot,
};

export default valuationSnapshotsApi;