import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createValuationSnapshot,
  deleteValuationSnapshot,
  updateValuationSnapshot,
  type SaveValuationSnapshotDto,
} from '../api/valuationSnapshots.api';

const invalidateInvestmentSnapshotOwnership = (
  queryClient: ReturnType<typeof useQueryClient>,
  investmentId?: string | number | null,
) => {
  queryClient.invalidateQueries({ queryKey: ['investment-snapshots'] });
  queryClient.invalidateQueries({ queryKey: ['investments'] });
  queryClient.invalidateQueries({ queryKey: ['investments', 'dashboard'] });

  if (investmentId == null || investmentId === '') return;
  queryClient.invalidateQueries({ queryKey: ['investment-snapshots', investmentId] });
  queryClient.invalidateQueries({ queryKey: ['investment', investmentId] });
  queryClient.invalidateQueries({ queryKey: ['investment', investmentId, 'performance'] });
};

export const useSaveInvestmentSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      snapshotId,
      payload,
    }: {
      snapshotId?: string | number | null;
      payload: SaveValuationSnapshotDto;
    }) =>
      snapshotId != null && snapshotId !== ''
        ? updateValuationSnapshot(payload.investmentId, snapshotId, payload)
        : createValuationSnapshot(payload),
    onSuccess: (_savedSnapshot, variables) => {
      invalidateInvestmentSnapshotOwnership(
        queryClient,
        variables.payload.investmentId,
      );
    },
  });
};

export const useDeleteInvestmentSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      snapshotId,
      investmentId,
    }: {
      snapshotId: string | number;
      investmentId: string | number;
    }) => deleteValuationSnapshot(investmentId, snapshotId),
    onSuccess: (_result, variables) => {
      invalidateInvestmentSnapshotOwnership(
        queryClient,
        variables.investmentId,
      );
    },
  });
};