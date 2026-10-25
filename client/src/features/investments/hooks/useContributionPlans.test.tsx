import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as plansApi from '../api/contributionPlans.api';
import * as eventsApi from '../api/investmentEvents.api';
import {
  useConfirmRecurringInvestmentContributionPlan,
  useDeleteInvestmentEvent,
  useRecordInvestmentContribution,
  useRecordInvestmentIncomeCredit,
  useRecordInvestmentWithdrawal,
  useSkipCurrentInvestmentContribution,
  useUpdateInvestmentContributionPlan,
  useUpdateInvestmentEvent,
} from './useContributionPlans';

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

afterEach(() => vi.restoreAllMocks());

describe('contribution plan hooks', () => {
  it('records contribution and withdrawal through their exact API payloads', async () => {
    const contribution = vi.spyOn(plansApi, 'recordInvestmentContribution').mockResolvedValue({ id: 1 });
    const withdrawal = vi.spyOn(plansApi, 'recordInvestmentWithdrawal').mockResolvedValue({ id: 2 });
    const queryClient = new QueryClient();
    const wrapper = createWrapper(queryClient);
    const contributionHook = renderHook(() => useRecordInvestmentContribution(), { wrapper });
    const withdrawalHook = renderHook(() => useRecordInvestmentWithdrawal(), { wrapper });

    await act(async () => {
      await contributionHook.result.current.mutateAsync({ investmentId: 'investment-1', amount: 100 });
      await withdrawalHook.result.current.mutateAsync({ investmentId: 'investment-1', amount: 25 });
    });

    expect(contribution).toHaveBeenCalledWith({ investmentId: 'investment-1', amount: 100 });
    expect(withdrawal).toHaveBeenCalledWith({ investmentId: 'investment-1', amount: 25 });
  });

  it('covers recurring plan, skip, income, and event update/delete mutations', async () => {
    vi.spyOn(plansApi, 'updateContributionPlan').mockResolvedValue({ id: 1 });
    vi.spyOn(plansApi, 'skipCurrentContributionPlan').mockResolvedValue({ id: 1 });
    vi.spyOn(plansApi, 'confirmRecurringContributionPlan').mockResolvedValue({ id: 1 });
    vi.spyOn(eventsApi, 'createInvestmentEvent').mockResolvedValue({ id: 1 } as never);
    vi.spyOn(eventsApi, 'updateInvestmentEvent').mockResolvedValue({ id: 1 } as never);
    vi.spyOn(eventsApi, 'deleteInvestmentEvent').mockResolvedValue(undefined);
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = createWrapper(queryClient);

    const updatePlan = renderHook(() => useUpdateInvestmentContributionPlan(), { wrapper });
    const skip = renderHook(() => useSkipCurrentInvestmentContribution(), { wrapper });
    const confirm = renderHook(() => useConfirmRecurringInvestmentContributionPlan(), { wrapper });
    const income = renderHook(() => useRecordInvestmentIncomeCredit(), { wrapper });
    const updateEvent = renderHook(() => useUpdateInvestmentEvent(), { wrapper });
    const deleteEvent = renderHook(() => useDeleteInvestmentEvent(), { wrapper });

    await act(async () => {
      await updatePlan.result.current.mutateAsync({ investmentId: 1, planId: 2, payload: { status: 'paused' } });
      await skip.result.current.mutateAsync({ investmentId: 1, planId: 2 });
      await confirm.result.current.mutateAsync({ investmentId: 1, payload: { amount: 50 } });
      await income.result.current.mutateAsync({ investmentId: 1, payload: { amount: 5 } });
      await updateEvent.result.current.mutateAsync({ investmentId: 1, eventId: 3, payload: { amount: 6 } });
      await deleteEvent.result.current.mutateAsync({ investmentId: 1, eventId: 3 });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investments', 'dashboard'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment', 1] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investment-events', 1] });
  });

  it('exposes mutation errors without invalidating on failure', async () => {
    const failure = new Error('Contribution failed');
    vi.spyOn(plansApi, 'recordInvestmentContribution').mockRejectedValue(failure);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRecordInvestmentContribution(), { wrapper: createWrapper(queryClient) });

    await expect(
      act(async () => result.current.mutateAsync({ investmentId: 1, amount: 10 })),
    ).rejects.toBe(failure);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});