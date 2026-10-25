import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as snapshotsApi from '../api/valuationSnapshots.api';
import { useDeleteInvestmentSnapshot, useSaveInvestmentSnapshot } from './useInvestmentSnapshots';

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

afterEach(() => vi.restoreAllMocks());

describe('investment snapshot hooks', () => {
  it('creates new snapshots and updates existing snapshots through the correct API', async () => {
    const create = vi.spyOn(snapshotsApi, 'createValuationSnapshot').mockResolvedValue({ id: 1 } as never);
    const update = vi.spyOn(snapshotsApi, 'updateValuationSnapshot').mockResolvedValue({ id: 2 } as never);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useSaveInvestmentSnapshot(), { wrapper: createWrapper(queryClient) });
    const payload = { investmentId: '7', snapshotDate: '2026-01-01', marketValue: 100 };

    await act(async () => {
      await result.current.mutateAsync({ payload });
      await result.current.mutateAsync({ snapshotId: '2', payload });
    });

    expect(create).toHaveBeenCalledWith(payload);
    expect(update).toHaveBeenCalledWith('7', '2', payload);
  });

  it('normalizes string investment IDs to numeric detail query keys and deletes snapshots', async () => {
    vi.spyOn(snapshotsApi, 'deleteValuationSnapshot').mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteInvestmentSnapshot(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync({ investmentId: '7', snapshotId: '9' });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment-snapshots', 7] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment', 7] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment', 7, 'performance'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });
});