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

export const getValuationSnapshots = async (): Promise<
  InvestmentValuationSnapshot[]
> => {
  const response = await apiClient.get('/valuation-snapshots');
  return Array.isArray(response.data) ? response.data : [];
};

export const getValuationSnapshotsByInvestment = async (
  investmentId: string | number,
): Promise<InvestmentValuationSnapshot[]> => {
  const response = await apiClient.get(
    `/investments/${investmentId}/valuation-snapshots`,
  );
  return response.data;
};

export const getValuationSnapshotById = async (
  investmentId: string | number,
  id: string | number,
): Promise<InvestmentValuationSnapshot> => {
  const response = await apiClient.get(
    `/investments/${investmentId}/valuation-snapshots/${id}`,
  );
  return response.data;
};

export const createValuationSnapshot = async (
  payload: SaveValuationSnapshotDto,
): Promise<InvestmentValuationSnapshot> => {
  const response = await apiClient.post(
    `/investments/${payload.investmentId}/valuation-snapshots`,
    payload,
  );
  return response.data;
};

export const updateValuationSnapshot = async (
  investmentId: string | number,
  id: string | number,
  payload: Partial<SaveValuationSnapshotDto>,
): Promise<InvestmentValuationSnapshot> => {
  const response = await apiClient.patch(
    `/investments/${investmentId}/valuation-snapshots/${id}`,
    payload,
  );
  return response.data;
};

export const deleteValuationSnapshot = async (
  investmentId: string | number,
  id: string | number,
): Promise<void> => {
  await apiClient.delete(`/investments/${investmentId}/valuation-snapshots/${id}`);
};

export const valuationSnapshotsApi = {
  getAll: getValuationSnapshots,
  getByInvestment: getValuationSnapshotsByInvestment,
  getById: getValuationSnapshotById,
  create: createValuationSnapshot,
  update: updateValuationSnapshot,
  delete: deleteValuationSnapshot,
};

export default valuationSnapshotsApi;