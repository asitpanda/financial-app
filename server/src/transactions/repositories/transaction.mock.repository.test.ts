import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransactionMockRepository } from './transaction.mock.repository';
import type { TransactionRecord } from '../transaction.types';

describe('TransactionMockRepository', () => {
  let repository: TransactionMockRepository;
  let transactions: TransactionRecord[];
  let goals: Array<{ id: number; userId: number; currentAmount: number }>;

  beforeEach(async () => {
    vi.resetModules();
    const [{ TransactionMockRepository: Repository }, { mockTransactionsStore }, { mockGoalsStore }] =
      await Promise.all([
        import('./transaction.mock.repository'),
        import('../../mockdata/transactions'),
        import('../../mockdata/goals'),
      ]);

    repository = new Repository();
    transactions = mockTransactionsStore;
    goals = mockGoalsStore;
  });

  describe('findAll', () => {
    it('returns only the requested user’s transactions', async () => {
      const records = await repository.findAll(1);

      expect(records.length).toBeGreaterThan(0);
      expect(records.every((record) => record.userId === 1)).toBe(true);
      await expect(repository.findAll(9201)).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('does not return another user’s transaction', async () => {
      await expect(repository.findOne(1, 9201)).resolves.toBeNull();
      await expect(repository.findOne(1, 1)).resolves.toMatchObject({ id: 1, userId: 1 });
    });
  });

  describe('create', () => {
    it('normalizes optional IDs and applies an income contribution to its goal', async () => {
      const goal = goals.find((item) => item.id === 1)!;
      const startingAmount = goal.currentAmount;

      const created = await repository.create({
        type: 'INCOME',
        amount: 125,
        categoryId: '2',
        goalId: '1',
        sourceAccountId: '',
        destinationAccountId: '3',
        date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      expect(created).toMatchObject({
        userId: 1,
        categoryId: 2,
        goalId: 1,
        sourceAccountId: null,
        destinationAccountId: 3,
        amount: 125,
        date: new Date('2026-10-25T00:00:00.000Z'),
      });
      expect(goal.currentAmount).toBe(startingAmount + 125);
      expect(transactions).toContain(created);
    });
  });

  describe('update', () => {
    it('applies only the difference when a goal-linked transaction changes type and amount', async () => {
      const goal = goals.find((item) => item.id === 1)!;
      const startingAmount = goal.currentAmount;
      const created = await repository.create({
        type: 'INCOME',
        amount: 50,
        goalId: 1,
        date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      const updated = await repository.update(created.id, { type: 'EXPENSE', amount: 30 }, 1);

      expect(updated).toMatchObject({ type: 'EXPENSE', amount: 30, goalId: 1 });
      expect(goal.currentAmount).toBe(startingAmount - 30);
    });
  });

  describe('delete', () => {
    it('reverses the goal delta and leaves other users’ transactions untouched', async () => {
      const goal = goals.find((item) => item.id === 1)!;
      const startingAmount = goal.currentAmount;
      const created = await repository.create({
        type: 'EXPENSE',
        amount: 75,
        goalId: 1,
        date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      await repository.delete(created.id, 9202);
      expect(transactions).toContain(created);
      expect(goal.currentAmount).toBe(startingAmount - 75);

      await repository.delete(created.id, 1);
      expect(transactions).not.toContain(created);
      expect(goal.currentAmount).toBe(startingAmount);
    });
  });

  describe('findByDateRange', () => {
    it('includes both endpoints and excludes transactions owned by another user', async () => {
      const before = await repository.create({
        type: 'INCOME', amount: 1, date: '2026-09-30T23:59:59.999Z',
      } as never, 9203);
      const lower = await repository.create({
        type: 'INCOME', amount: 2, date: '2026-10-01T00:00:00.000Z',
      } as never, 9203);
      const upper = await repository.create({
        type: 'INCOME', amount: 3, date: '2026-10-31T00:00:00.000Z',
      } as never, 9203);
      const after = await repository.create({
        type: 'INCOME', amount: 4, date: '2026-11-01T00:00:00.000Z',
      } as never, 9203);
      await repository.create({
        type: 'INCOME', amount: 5, date: '2026-10-15T00:00:00.000Z',
      } as never, 9204);

      await expect(
        repository.findByDateRange(
          9203,
          new Date('2026-10-01T00:00:00.000Z'),
          new Date('2026-10-31T00:00:00.000Z'),
        ),
      ).resolves.toEqual([lower, upper]);
      expect(transactions).toEqual(expect.arrayContaining([before, after]));
    });
  });

  describe('findByType', () => {
    it('filters by both owner and transaction type', async () => {
      const matching = await repository.create({
        type: 'TRANSFER', amount: 10, date: '2026-10-25T00:00:00.000Z',
      } as never, 9204);
      await repository.create({
        type: 'INCOME', amount: 20, date: '2026-10-25T00:00:00.000Z',
      } as never, 9204);
      await repository.create({
        type: 'TRANSFER', amount: 30, date: '2026-10-25T00:00:00.000Z',
      } as never, 9205);

      await expect(repository.findByType(9204, 'TRANSFER')).resolves.toEqual([matching]);
    });
  });
});