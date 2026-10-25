import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoalRecord } from '../goal.types';
import type { IGoalDataSourcePort } from './goal.datasource.port';
import { GoalRepository } from './goal.repository';

function createRepository() {
  const dataSource = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    repository: new GoalRepository(dataSource as unknown as IGoalDataSourcePort),
    dataSource,
  };
}

const goal: GoalRecord = {
  id: 7,
  userId: 42,
  name: 'Emergency fund',
  categoryId: 2,
  categoryLabelSnapshot: 'Savings',
  description: null,
  icon: null,
  targetAmount: 5000,
  currentAmount: 0,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  deadline: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('GoalRepository', () => {
  let repository: GoalRepository;
  let dataSource: ReturnType<typeof createRepository>['dataSource'];

  beforeEach(() => {
    ({ repository, dataSource } = createRepository());
  });

  describe('create', () => {
    it('forwards the goal data and owner and returns the created goal', async () => {
      const input = {
        name: 'Emergency fund',
        categoryId: 2,
        categoryLabelSnapshot: 'Savings',
        targetAmount: 5000,
      };
      dataSource.create.mockResolvedValue(goal);

      await expect(repository.create(input, 42)).resolves.toBe(goal);
      expect(dataSource.create).toHaveBeenCalledWith(input, 42);
    });
  });

  describe('findAll', () => {
    it('forwards the owner and returns the matching goals', async () => {
      dataSource.findAll.mockResolvedValue([goal]);

      await expect(repository.findAll(42)).resolves.toEqual([goal]);
      expect(dataSource.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findOne', () => {
    it('forwards the goal and owner identifiers when no record exists', async () => {
      dataSource.findOne.mockResolvedValue(null);

      await expect(repository.findOne(7, 42)).resolves.toBeNull();
      expect(dataSource.findOne).toHaveBeenCalledWith(7, 42);
    });
  });

  describe('update', () => {
    it('forwards the goal data and returns the data source result', async () => {
      const input = { name: 'Updated emergency fund' };
      dataSource.update.mockResolvedValue(goal);

      await expect(repository.update(7, input, 42)).resolves.toBe(goal);
      expect(dataSource.update).toHaveBeenCalledWith(7, input, 42);
    });
  });

  describe('delete', () => {
    it('forwards the goal and owner identifiers', async () => {
      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(dataSource.delete).toHaveBeenCalledWith(7, 42);
    });
  });
});