import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoalMockRepository } from './goal.mock.repository';

function goalRecord(id: number, userId: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId,
    name: `Goal ${id}`,
    categoryId: 2,
    categoryLabelSnapshot: 'Savings',
    description: 'Goal description',
    icon: 'medical',
    targetAmount: 5000,
    currentAmount: 100,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    deadline: new Date('2027-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('GoalMockRepository', () => {
  let repository: GoalMockRepository;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('../../mockdata/goals', () => ({
      mockGoalsStore: [goalRecord(1, 1), goalRecord(2, 2)],
    }));
    const { GoalMockRepository: Repository } = await import('./goal.mock.repository');
    repository = new Repository();
  });

  describe('create', () => {
    it('applies defaults, parses the deadline, and assigns the requesting user', async () => {
      const created = await repository.create({
        name: 'New goal',
        categoryId: 3,
        categoryLabelSnapshot: 'Travel',
        targetAmount: 2000,
        deadline: '2027-06-30T00:00:00.000Z',
      } as never, 8);

      expect(created).toMatchObject({
        id: 3,
        userId: 8,
        name: 'New goal',
        icon: 'gift',
        description: null,
        currentAmount: 0,
        deadline: new Date('2027-06-30T00:00:00.000Z'),
      });
      expect(created.startDate).toBeInstanceOf(Date);
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });

    it('starts goal IDs at one when the mock store is empty', async () => {
      vi.doMock('../../mockdata/goals', () => ({ mockGoalsStore: [] }));
      vi.resetModules();

      try {
        const { GoalMockRepository: EmptyStoreRepository } = await import('./goal.mock.repository');
        const created = await new EmptyStoreRepository().create({
          name: 'First goal',
          categoryId: 2,
          categoryLabelSnapshot: 'Savings',
          targetAmount: 100,
        } as never, 42);

        expect(created.id).toBe(1);
      } finally {
        vi.doUnmock('../../mockdata/goals');
        vi.resetModules();
      }
    });

    it('preserves an explicitly funded starting amount and custom icon', async () => {
      const created = await repository.create({
        name: 'Trip fund',
        categoryId: 3,
        categoryLabelSnapshot: 'Travel',
        targetAmount: 3000,
        currentAmount: 450,
        description: 'Flights and lodging',
        icon: 'plane',
      } as never, 8);

      expect(created).toMatchObject({
        currentAmount: 450,
        description: 'Flights and lodging',
        icon: 'plane',
        deadline: null,
      });
    });
  });

  describe('findAll', () => {
    it('returns only goals owned by the requested user', async () => {
      await expect(repository.findAll(1)).resolves.toMatchObject([{ id: 1, userId: 1 }]);
      await expect(repository.findAll(999)).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('does not expose a goal to another user or return an unknown goal', async () => {
      await expect(repository.findOne(1, 1)).resolves.toMatchObject({ id: 1, userId: 1 });
      await expect(repository.findOne(1, 2)).resolves.toBeUndefined();
      await expect(repository.findOne(999, 1)).resolves.toBeUndefined();
    });
  });

  describe('update', () => {
    it('clears nullable fields, preserves the existing icon fallback, and updates the timestamp', async () => {
      const updated = await repository.update(1, {
        description: null,
        icon: '',
        deadline: '',
      } as never, 1);

      expect(updated).toMatchObject({
        id: 1,
        description: null,
        icon: 'medical',
        deadline: null,
        name: 'Goal 1',
      });
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00.000Z').getTime());
      await expect(repository.update(1, { name: 'Unauthorized' } as never, 2)).resolves.toBeNull();
      await expect(repository.update(999, { name: 'Missing' } as never, 1)).resolves.toBeNull();
    });

    it('uses the default icon when both the update and stored icon are blank', async () => {
      const { mockGoalsStore } = await import('../../mockdata/goals');
      const existing = mockGoalsStore.find(({ id }) => id === 1);
      if (existing) existing.icon = '';

      await expect(repository.update(1, { icon: '' } as never, 1)).resolves.toMatchObject({ icon: 'gift' });
    });
  });

  describe('delete', () => {
    it('deletes only the goal owned by the requester', async () => {
      await repository.delete(1, 2);
      await expect(repository.findOne(1, 1)).resolves.toMatchObject({ id: 1 });

      await repository.delete(1, 1);

      await expect(repository.findOne(1, 1)).resolves.toBeUndefined();
      await expect(repository.findOne(2, 2)).resolves.toMatchObject({ id: 2 });
    });
  });
});