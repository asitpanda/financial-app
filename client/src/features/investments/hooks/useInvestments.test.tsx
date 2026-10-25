import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import investmentApi from '../api/investments.api';
import investmentBenefitsApi from '../api/investmentBenefits.api';
import {
  useCreateInvestment,
  useDeleteInvestment,
  useInvestment,
  useInvestmentSummaryPageData,
  useUpdateInvestment,
} from './useInvestments';
import {
  useCreateInvestmentBenefit,
  useInvestmentBenefitsByInvestment,
} from './useInvestmentBenefits';
import { useNotificationStore } from '../../../store/notificationStore';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const createWrapper = (queryClient = createQueryClient()) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

afterEach(() => vi.restoreAllMocks());

describe('investment React Query hooks', () => {
  it('normalizes malformed list data and reports load failures', async () => {
    vi.spyOn(investmentApi, 'getAll').mockResolvedValue(null as never);
    const first = renderHook(() => useInvestmentSummaryPageData(), { wrapper: createWrapper() });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.investments).toEqual([]);

    const failure = new Error('Investments unavailable');
    vi.spyOn(investmentApi, 'getAll').mockRejectedValue(failure);
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');
    const second = renderHook(() => useInvestmentSummaryPageData(), { wrapper: createWrapper() });
    await waitFor(() => expect(second.result.current.error).toBe(failure));
    expect(pushNotification).toHaveBeenCalledWith({
      type: 'error',
      message: 'Failed to load investments',
    });
  });

  it('does not fetch detail data without an ID', async () => {
    const getById = vi.spyOn(investmentApi, 'getById');
    const { result } = renderHook(() => useInvestment(''), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(getById).not.toHaveBeenCalled();
  });

  it('invalidates summary, dashboard, and detail queries after create/update/delete', async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const removeQueries = vi.spyOn(queryClient, 'removeQueries');
    vi.spyOn(investmentApi, 'create').mockResolvedValue({ id: 'created' } as never);
    vi.spyOn(investmentApi, 'update').mockResolvedValue({ id: 'updated' } as never);
    vi.spyOn(investmentApi, 'delete').mockResolvedValue(undefined);
    const wrapper = createWrapper(queryClient);

    const createHook = renderHook(() => useCreateInvestment(), { wrapper });
    await act(async () => {
      await createHook.result.current.mutateAsync({
        name: 'Fund',
        totalInvested: 100,
        status: 'active',
        contributionMode: 'ONE_TIME',
      });
    });
    const updateHook = renderHook(() => useUpdateInvestment(), { wrapper });
    await act(async () => {
      await updateHook.result.current.mutateAsync({ id: 'updated', data: { name: 'Updated' } });
    });
    const deleteHook = renderHook(() => useDeleteInvestment(), { wrapper });
    await act(async () => {
      await deleteHook.result.current.mutateAsync('updated');
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investments'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment', 'updated'] });
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ['investment', 'updated'], exact: true });
  });

  it('keeps benefit detail queries disabled until both IDs are available', async () => {
    const getByInvestmentId = vi.spyOn(investmentBenefitsApi, 'getByInvestmentId');
    const getById = vi.spyOn(investmentBenefitsApi, 'getById');
    const first = renderHook(() => useInvestmentBenefitsByInvestment('', true), { wrapper: createWrapper() });
    const second = renderHook(() => useInvestmentBenefitsByInvestment('investment-1', false), { wrapper: createWrapper() });
    await waitFor(() => expect(first.result.current.fetchStatus).toBe('idle'));
    await waitFor(() => expect(second.result.current.fetchStatus).toBe('idle'));
    expect(getByInvestmentId).not.toHaveBeenCalled();
    expect(getById).not.toHaveBeenCalled();
  });

  it('invalidates dashboard and investment data after a benefit mutation', async () => {
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    vi.spyOn(investmentBenefitsApi, 'create').mockResolvedValue({ id: 'benefit-1' } as never);
    const { result } = renderHook(() => useCreateInvestmentBenefit(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync({
        investmentId: 'investment-1',
        payload: { benefitType: 'BONUS', amount: 50, benefitDate: '2026-12-01' },
      });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investments'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment', 'investment-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment-events'] });
  });
});