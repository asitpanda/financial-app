import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import { createGoal, deleteGoal, getGoalById, getGoals, updateGoal } from './goals.api';

afterEach(() => vi.restoreAllMocks());

describe('goals.api', () => {
  it('supports CRUD operations with correct endpoints', async () => {
    const data = [{ id: 'goal-1' }];
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data } as never);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data } as never);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data } as never);
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never);
    const payload = {} as Parameters<typeof createGoal>[0];
    const updatePayload = {} as Parameters<typeof updateGoal>[1];

    await expect(getGoals()).resolves.toBe(data);
    await expect(getGoalById('goal-1')).resolves.toBe(data);
    await expect(createGoal(payload)).resolves.toBe(data);
    await expect(updateGoal('goal-1', updatePayload)).resolves.toBe(data);
    await expect(deleteGoal('goal-1')).resolves.toBeUndefined();

    expect(get).toHaveBeenNthCalledWith(1, '/goals');
    expect(get).toHaveBeenNthCalledWith(2, '/goals/goal-1');
    expect(post).toHaveBeenCalledWith('/goals', payload);
    expect(patch).toHaveBeenCalledWith('/goals/goal-1', updatePayload);
    expect(remove).toHaveBeenCalledWith('/goals/goal-1');
  });
});