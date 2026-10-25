import { afterEach, describe, expect, it, vi } from 'vitest';
import goalApi from './goals.api';
import { removeGoal, saveGoal } from './goals.service';

afterEach(() => vi.restoreAllMocks());

const payload = {
  name: 'Emergency fund',
  category: 'Savings',
  categoryId: 4,
  description: 'Six months of expenses',
  icon: 'gift',
  targetAmount: 1000,
  currentAmount: 250,
  deadline: new Date('2026-12-31T00:00:00.000Z'),
};

describe('goals.service', () => {
  it('maps and creates a valid goal payload', async () => {
    const create = vi.spyOn(goalApi, 'create').mockResolvedValue({ id: 'goal-1' } as never);

    await saveGoal({ payload });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Emergency fund',
      categoryId: 4,
      categoryLabelSnapshot: 'Savings',
      targetAmount: 1000,
      currentAmount: 250,
      deadline: '2026-12-31T00:00:00.000Z',
    }));
  });

  it('updates an existing goal and rejects an invalid category', async () => {
    const update = vi.spyOn(goalApi, 'update').mockResolvedValue({ id: 'goal-1' } as never);
    const selectedGoal = { id: 'goal-1' } as never;

    await saveGoal({ payload, selectedGoal });
    expect(update).toHaveBeenCalledWith('goal-1', expect.objectContaining({ categoryId: 4 }));

    await expect(saveGoal({ payload: { ...payload, categoryId: 0 } })).rejects.toThrow('A valid goal category must be selected');
  });

  it('deletes a goal through the API boundary', async () => {
    const remove = vi.spyOn(goalApi, 'delete').mockResolvedValue(undefined);

    await removeGoal('goal-1');

    expect(remove).toHaveBeenCalledWith('goal-1');
  });
});
