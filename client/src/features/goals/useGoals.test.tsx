import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import goalApi from './goals.api';
import transactionApi from '../transactions/transactions.api';
import { useNotificationStore } from '../../store/notificationStore';
import {
  useCreateGoal,
  useDeleteGoal,
  useGoal,
  useGoalPageData,
  useRemoveGoal,
  useUpdateGoal,
} from './useGoals';

const createWrapper = (queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

afterEach(() => vi.restoreAllMocks());

describe('goal hooks', () => {
  it('loads page data and normalizes non-array responses', async () => {
    vi.spyOn(goalApi, 'getAll').mockResolvedValue(null as never);
    vi.spyOn(transactionApi, 'getAll').mockResolvedValue([] as never);

    const { result } = renderHook(() => useGoalPageData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.goals).toEqual([]);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('notifies on page-data failure and exposes the original error', async () => {
    const failure = new Error('Network unavailable');
    vi.spyOn(goalApi, 'getAll').mockRejectedValue(failure);
    vi.spyOn(transactionApi, 'getAll').mockResolvedValue([] as never);
    const pushNotification = vi.spyOn(useNotificationStore.getState(), 'pushNotification');

    const { result } = renderHook(() => useGoalPageData(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe(failure));
    await waitFor(() => expect(pushNotification).toHaveBeenCalledWith({
      type: 'error',
      message: 'Failed to load goals',
    }));
  });

  it('does not fetch an individual goal when its id is empty', async () => {
    const getById = vi.spyOn(goalApi, 'getById');
    const { result } = renderHook(() => useGoal(''), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(getById).not.toHaveBeenCalled();
  });

  it('runs goal mutations and invalidates goal and dashboard queries', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const create = vi.spyOn(goalApi, 'create').mockResolvedValue({ id: 'goal-1' } as never);
    const update = vi.spyOn(goalApi, 'update').mockResolvedValue({ id: 'goal-1' } as never);
    const remove = vi.spyOn(goalApi, 'delete').mockResolvedValue(undefined);
    const wrapper = createWrapper(queryClient);

    const createHook = renderHook(() => useCreateGoal(), { wrapper });
    await act(async () => {
      await createHook.result.current.mutateAsync({ name: 'Fund', categoryId: 1, categoryLabelSnapshot: 'Savings', targetAmount: 100 });
    });
    const updateHook = renderHook(() => useUpdateGoal(), { wrapper });
    await act(async () => {
      await updateHook.result.current.mutateAsync({ id: 'goal-1', data: { name: 'Updated fund' } });
    });
    const deleteHook = renderHook(() => useDeleteGoal(), { wrapper });
    await act(async () => {
      await deleteHook.result.current.mutateAsync('goal-1');
    });
    const removeHook = renderHook(() => useRemoveGoal(), { wrapper });
    await act(async () => {
      await removeHook.result.current.mutateAsync('goal-1');
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Fund' }));
    expect(update).toHaveBeenCalledWith('goal-1', { name: 'Updated fund' });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['goals'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['goals', 'page-data'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });
});
