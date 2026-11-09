import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransactionMockRepository } from './transaction.mock.repository';
import type { TransactionRecord } from '../transaction.types';

function makeTransaction(overrides: Partial<TransactionRecord> & { investmentEventType?: string } = {}): TransactionRecord {
  const date = new Date('2026-10-15T12:00:00.000Z');
  return {
    id: 900,
    userId: 9206,
    type: 'EXPENSE',
    amount: 10,
    categoryId: 8,
    categoryLabelSnapshot: 'Cafe',
    sourceAccountId: null,
    destinationAccountId: null,
    date,
    notes: null,
    goalId: null,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

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

    it('stores absent optional references as null without changing goals', async () => {
      const created = await repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z',
        categoryId: null, sourceAccountId: null,
      } as never, 9206);

      expect(created).toMatchObject({ categoryId: null, goalId: null, sourceAccountId: null, destinationAccountId: null });
      expect(transactions).toContain(created);
    });

    it('does not change another user’s goal and clamps goal balances at zero', async () => {
      const anotherUsersGoal = goals.find((item) => item.id === 1)!;
      const emptyGoal = goals.find((item) => item.id === 3)!;
      const anotherUsersStartingAmount = anotherUsersGoal.currentAmount;

      await repository.create({
        type: 'INCOME', amount: 100, goalId: 1, date: '2026-10-25T00:00:00.000Z',
      } as never, 9206);
      await repository.create({
        type: 'EXPENSE', amount: 500, goalId: 3, date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      expect(anotherUsersGoal.currentAmount).toBe(anotherUsersStartingAmount);
      expect(emptyGoal.currentAmount).toBe(0);
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

    it('reverses the old goal and applies the signed delta to a new goal', async () => {
      const firstGoal = goals.find((item) => item.id === 1)!;
      const secondGoal = goals.find((item) => item.id === 2)!;
      const firstStartingAmount = firstGoal.currentAmount;
      const secondStartingAmount = secondGoal.currentAmount;
      const created = await repository.create({
        type: 'INCOME', amount: 40, goalId: 1, date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      const updated = await repository.update(created.id, { type: 'EXPENSE', amount: 20, goalId: '2' } as never, 1);

      expect(updated).toMatchObject({ type: 'EXPENSE', amount: 20, goalId: 2 });
      expect(firstGoal.currentAmount).toBe(firstStartingAmount);
      expect(secondGoal.currentAmount).toBe(secondStartingAmount - 20);
    });

    it('applies a goal delta when an existing transaction is linked to a goal', async () => {
      const goal = goals.find((item) => item.id === 2)!;
      const startingAmount = goal.currentAmount;
      const created = await repository.create({
        type: 'INCOME', amount: 25, date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      const updated = await repository.update(created.id, { goalId: 2 } as never, 1);

      expect(updated).toMatchObject({ goalId: 2 });
      expect(goal.currentAmount).toBe(startingAmount + 25);
    });

    it('normalizes changed references and nullable notes while replacing the transaction date', async () => {
      const created = await repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      await expect(repository.update(created.id, {
        categoryId: '2',
        goalId: '',
        sourceAccountId: '1',
        destinationAccountId: null,
        date: '2026-11-01T00:00:00.000Z',
        notes: null,
      } as never, 1)).resolves.toMatchObject({
        categoryId: 2,
        goalId: null,
        sourceAccountId: 1,
        destinationAccountId: null,
        date: new Date('2026-11-01T00:00:00.000Z'),
        notes: null,
      });
    });

    it('reverses a goal contribution when the transaction is unlinked', async () => {
      const goal = goals.find((item) => item.id === 1)!;
      const startingAmount = goal.currentAmount;
      const created = await repository.create({
        type: 'INCOME', amount: 40, goalId: 1, date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      const updated = await repository.update(created.id, { goalId: null }, 1);

      expect(goal.currentAmount).toBe(startingAmount);
      expect(updated?.goalId).toBeNull();
    });

    it('returns null when the transaction is not owned by the requester', async () => {
      const created = await repository.create({
        type: 'INCOME', amount: 25, date: '2026-10-25T00:00:00.000Z',
      } as never, 1);

      await expect(repository.update(created.id, { amount: 100 }, 9206)).resolves.toBeNull();
      expect(created.amount).toBe(25);
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

  describe('findPage', () => {
    it('applies owner, account, type, category, inclusive date, and case-insensitive search filters before paging', async () => {
      const lower = makeTransaction({ id: 901, sourceAccountId: 5, date: new Date('2026-10-01T00:00:00.000Z'), notes: 'Coffee shop', amount: 100 });
      const upper = makeTransaction({ id: 902, destinationAccountId: 5, date: new Date('2026-10-31T23:59:59.999Z'), notes: null, categoryLabelSnapshot: 'COFFEE supplies', amount: 200 });
      transactions.push(
        lower,
        upper,
        makeTransaction({ id: 903, sourceAccountId: 6 }),
        makeTransaction({ id: 904, type: 'INCOME', sourceAccountId: 5 }),
        makeTransaction({ id: 905, sourceAccountId: 5, categoryId: 9 }),
        makeTransaction({ id: 906, sourceAccountId: 5, date: new Date('2026-09-30T23:59:59.999Z') }),
        makeTransaction({ id: 907, sourceAccountId: 5, date: new Date('2026-11-01T00:00:00.000Z') }),
        makeTransaction({ id: 908, sourceAccountId: 5, notes: 'Utilities' }),
        makeTransaction({ id: 909, userId: 9207, sourceAccountId: 5 }),
      );

      await expect(repository.findPage(9206, {
        page: 1,
        limit: 1,
        accountId: 5,
        type: 'EXPENSE',
        categoryId: 8,
        fromDate: '2026-10-01T00:00:00.000Z',
        toDate: '2026-10-31T23:59:59.999Z',
        search: '  coffee ',
        sortBy: 'amount',
        sortDirection: 'desc',
      })).resolves.toEqual({ items: [upper], total: 2 });
    });

    it.each([
      ['date', [911, 913, 912]],
      ['createdAt', [912, 913, 911]],
      ['amount', [911, 913, 912]],
    ] as const)('sorts by %s ascending with an ID tie-breaker', async (sortBy, expectedIds) => {
      transactions.push(
        makeTransaction({ id: 911, date: new Date('2026-10-01T00:00:00.000Z'), createdAt: new Date('2026-10-03T00:00:00.000Z'), amount: 100 }),
        makeTransaction({ id: 912, date: new Date('2026-10-03T00:00:00.000Z'), createdAt: new Date('2026-10-01T00:00:00.000Z'), amount: 200 }),
        makeTransaction({ id: 913, date: new Date('2026-10-02T00:00:00.000Z'), createdAt: new Date('2026-10-02T00:00:00.000Z'), amount: 100 }),
      );

      const result = await repository.findPage(9206, { page: 1, limit: 10, sortBy, sortDirection: 'asc' });

      expect(result.items.map(({ id }) => id)).toEqual(expectedIds);
      expect(result.total).toBe(3);
    });

    it('sorts amounts descending and applies the requested page offset', async () => {
      transactions.push(
        makeTransaction({ id: 921, amount: 100 }),
        makeTransaction({ id: 922, amount: 300 }),
        makeTransaction({ id: 923, amount: 200 }),
      );

      await expect(repository.findPage(9206, { page: 2, limit: 1, sortBy: 'amount' }))
        .resolves.toEqual({ items: [expect.objectContaining({ id: 923 })], total: 3 });
    });
  });

  describe('findAllForAccount', () => {
    it('includes source and destination account activity in chronological order with an ID tie-breaker', async () => {
      const source = makeTransaction({ id: 931, sourceAccountId: 5, date: new Date('2026-10-02T00:00:00.000Z') });
      const destination = makeTransaction({ id: 932, destinationAccountId: 5, date: new Date('2026-10-01T00:00:00.000Z') });
      const sameDateHigherId = makeTransaction({ id: 934, sourceAccountId: 5, date: new Date('2026-10-02T00:00:00.000Z') });
      const sameDateLowerId = makeTransaction({ id: 933, destinationAccountId: 5, date: new Date('2026-10-02T00:00:00.000Z') });
      transactions.push(source, destination, sameDateHigherId, sameDateLowerId, makeTransaction({ id: 935, userId: 9207, sourceAccountId: 5 }));

      await expect(repository.findAllForAccount(9206, 5)).resolves.toEqual([
        destination, source, sameDateLowerId, sameDateHigherId,
      ]);
    });
  });

  describe('getPeriodTypeTotals', () => {
    it('excludes investment withdrawal income from amounts but retains its count', async () => {
      transactions.push(
        makeTransaction({ id: 941, type: 'INCOME', amount: 100, date: new Date('2026-10-01T00:00:00.000Z'), investmentEventType: 'CONTRIBUTION' }),
        makeTransaction({ id: 942, type: 'INCOME', amount: 40, date: new Date('2026-10-31T23:59:59.999Z'), investmentEventType: 'WITHDRAWAL_PRINCIPAL' }),
        makeTransaction({ id: 943, type: 'EXPENSE', amount: 25, date: new Date('2026-10-15T00:00:00.000Z') }),
        makeTransaction({ id: 944, type: 'INCOME', amount: 300, date: new Date('2026-09-30T23:59:59.999Z') }),
        makeTransaction({ id: 945, type: 'INCOME', amount: 500, date: new Date('2026-11-01T00:00:00.000Z') }),
        makeTransaction({ id: 946, userId: 9207, type: 'INCOME', amount: 900 }),
      );

      await expect(repository.getPeriodTypeTotals(9206, '2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z')).resolves.toEqual([
        { type: 'INCOME', amount: 100, count: 2 },
        { type: 'EXPENSE', amount: 25, count: 1 },
      ]);
    });

    it('returns no totals when the user has no transactions', async () => {
      await expect(repository.getPeriodTypeTotals(9208)).resolves.toEqual([]);
    });
  });
});