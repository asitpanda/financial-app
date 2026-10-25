import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import taxonomyApi from '../api/investmentAssetTaxonomy.api';
import { useInvestmentAssetTaxonomy, useRemoveInvestmentAssetTaxonomy, useSaveInvestmentAssetTaxonomy } from './useInvestmentAssetTaxonomy';

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

afterEach(() => vi.restoreAllMocks());

describe('investment taxonomy hooks', () => {
  it('loads taxonomy nodes and surfaces query failures', async () => {
    const failure = new Error('Taxonomy unavailable');
    vi.spyOn(taxonomyApi, 'getAll').mockRejectedValue(failure);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useInvestmentAssetTaxonomy(), { wrapper: createWrapper(queryClient) });
    await waitFor(() => expect(result.current.error).toBe(failure));
  });

  it('invalidates taxonomy and investment reference data after save and remove', async () => {
    vi.spyOn(taxonomyApi, 'create').mockResolvedValue({ id: 1 } as never);
    vi.spyOn(taxonomyApi, 'delete').mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);
    const save = renderHook(() => useSaveInvestmentAssetTaxonomy(), { wrapper });
    const remove = renderHook(() => useRemoveInvestmentAssetTaxonomy(), { wrapper });

    await act(async () => {
      await save.result.current.mutateAsync({ label: 'Equity', nodeType: 'category', level: 1 });
      await remove.result.current.mutateAsync(1);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment-taxonomy'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investments', 'reference-data'] });
  });
});