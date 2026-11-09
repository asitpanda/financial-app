import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { TransactionPrismaRepository } from './transaction.prisma.repository';

function createRepository() {
  const transaction = {
    transaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    category: { findFirst: vi.fn().mockResolvedValue({ id: 5 }) },
    goal: {
      findFirst: vi.fn().mockResolvedValue({ id: 4 }),
      update: vi.fn(),
    },
    financialAccount: { findFirst: vi.fn().mockResolvedValue({ id: 9 }) },
  };
  const prisma = {
    ...transaction,
    $transaction: vi.fn(async (operation: unknown) => Array.isArray(operation)
      ? Promise.all(operation)
      : (operation as (client: unknown) => Promise<unknown>)(transaction)),
  };

  return {
    repository: new TransactionPrismaRepository(prisma as unknown as PrismaService),
    prisma,
    transaction,
  };
}

function transactionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    userId: 42,
    type: 'INCOME',
    amount: 100,
    categoryId: null,
    categoryLabelSnapshot: null,
    sourceAccountId: null,
    destinationAccountId: null,
    date: new Date('2026-10-25T00:00:00.000Z'),
    notes: null,
    goalId: null,
    createdAt: new Date('2026-10-25T00:00:00.000Z'),
    updatedAt: new Date('2026-10-25T00:00:00.000Z'),
    linkedInvestmentEvents: [],
    ...overrides,
  };
}

describe('TransactionPrismaRepository', () => {
  let repository: TransactionPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];
  let transaction: ReturnType<typeof createRepository>['transaction'];

  beforeEach(() => {
    ({ repository, prisma, transaction } = createRepository());
  });

  describe('findAll', () => {
    it('scopes to the owner and maps linked investment context', async () => {
      const investmentContext = { id: 7, name: 'Index fund', institutionName: 'Broker' };
      transaction.transaction.findMany.mockResolvedValue([
        transactionRow({
          linkedInvestmentEvents: [{ eventType: 'CONTRIBUTION', investment: investmentContext }],
        }),
      ]);

      await expect(repository.findAll(42)).resolves.toMatchObject([
        { investment: investmentContext, investmentEventType: 'CONTRIBUTION' },
      ]);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: { date: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    it('returns null when no transaction belongs to the requested user', async () => {
      transaction.transaction.findFirst.mockResolvedValue(null);

      await expect(repository.findOne(12, 43)).resolves.toBeNull();
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 12, userId: 43 } }),
      );
    });

    it('maps linked investment context and defaults missing event context to null', async () => {
      const investment = { id: 7, name: 'Index fund', institutionName: null };
      transaction.transaction.findFirst
        .mockResolvedValueOnce(transactionRow({ linkedInvestmentEvents: [{ eventType: 'CONTRIBUTION', investment }] }))
        .mockResolvedValueOnce(transactionRow());

      await expect(repository.findOne(12, 42)).resolves.toMatchObject({
        investment,
        investmentEventType: 'CONTRIBUTION',
      });
      await expect(repository.findOne(13, 42)).resolves.toMatchObject({
        investment: null,
        investmentEventType: null,
      });
    });
  });

  describe('findPage', () => {
    it('combines owner and requested filters, paginates, and maps investment context', async () => {
      const investment = { id: 7, name: 'Index fund', institutionName: 'Broker' };
      transaction.transaction.findMany.mockResolvedValue([
        transactionRow({ linkedInvestmentEvents: [{ eventType: 'CONTRIBUTION', investment }] }),
      ]);
      transaction.transaction.count.mockResolvedValue(17);
      const fromDate = '2026-10-01T00:00:00.000Z';
      const toDate = '2026-10-31T23:59:59.999Z';

      await expect(repository.findPage(42, {
        page: 3,
        limit: 5,
        accountId: 9,
        type: 'EXPENSE',
        categoryId: 5,
        fromDate,
        toDate,
        search: '  rent  ',
        sortBy: 'amount',
        sortDirection: 'asc',
      })).resolves.toEqual({
        items: [expect.objectContaining({ investment, investmentEventType: 'CONTRIBUTION' })],
        total: 17,
      });

      const where = {
        userId: 42,
        AND: [
          { OR: [{ sourceAccountId: 9 }, { destinationAccountId: 9 }] },
          { type: 'EXPENSE' },
          { categoryId: 5 },
          { date: { gte: new Date(fromDate), lte: new Date(toDate) } },
          { OR: [
            { notes: { contains: 'rent', mode: 'insensitive' } },
            { categoryLabelSnapshot: { contains: 'rent', mode: 'insensitive' } },
          ] },
        ],
      };
      expect(transaction.transaction.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ amount: 'asc' }, { id: 'asc' }],
        skip: 10,
        take: 5,
        include: expect.any(Object),
      });
      expect(transaction.transaction.count).toHaveBeenCalledExactlyOnceWith({ where });
      expect(prisma.$transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Array));
    });

    it('applies a single date bound and ignores a blank search string', async () => {
      transaction.transaction.findMany.mockResolvedValue([]);
      transaction.transaction.count.mockResolvedValue(0);

      await repository.findPage(42, { page: 1, limit: 10, toDate: '2026-10-31T00:00:00.000Z', search: '   ' });

      expect(transaction.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 42, AND: [{ date: { lte: new Date('2026-10-31T00:00:00.000Z') } }] },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
      }));
    });

    it('omits empty filter conditions for an unfiltered first page', async () => {
      transaction.transaction.findMany.mockResolvedValue([]);
      transaction.transaction.count.mockResolvedValue(0);

      await expect(repository.findPage(42, { page: 1, limit: 10 })).resolves.toEqual({ items: [], total: 0 });
      expect(transaction.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }));
    });
  });

  describe('findAllForAccount', () => {
    it('filters both account directions and returns activity chronologically with an ID tie-breaker', async () => {
      transaction.transaction.findMany.mockResolvedValue([
        transactionRow({ id: 13, date: new Date('2026-10-03T00:00:00.000Z') }),
        transactionRow({ id: 12, date: new Date('2026-10-02T00:00:00.000Z') }),
        transactionRow({ id: 11, date: new Date('2026-10-02T00:00:00.000Z') }),
      ]);

      await expect(repository.findAllForAccount(42, 9)).resolves.toMatchObject([
        { id: 11 }, { id: 12 }, { id: 13 },
      ]);
      expect(transaction.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: [{ sourceAccountId: 9 }, { destinationAccountId: 9 }], userId: 42 },
      }));
    });
  });

  describe('getPeriodTypeTotals', () => {
    it('excludes investment withdrawal income from the amount while preserving the grouped count', async () => {
      const fromDate = '2026-10-01T00:00:00.000Z';
      const toDate = '2026-10-31T23:59:59.999Z';
      transaction.transaction.groupBy.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 150 }, _count: { _all: 3 } },
        { type: 'EXPENSE', _sum: { amount: 40 }, _count: { _all: 2 } },
      ]);
      transaction.transaction.aggregate.mockResolvedValue({ _sum: { amount: 100 } });

      await expect(repository.getPeriodTypeTotals(42, fromDate, toDate)).resolves.toEqual([
        { type: 'INCOME', amount: 100, count: 3 },
        { type: 'EXPENSE', amount: 40, count: 2 },
      ]);
      const dateFilter = { date: { gte: new Date(fromDate), lte: new Date(toDate) } };
      expect(transaction.transaction.groupBy).toHaveBeenCalledWith({
        by: ['type'], where: { userId: 42, ...dateFilter },
        _sum: { amount: true }, _count: { _all: true },
      });
      expect(transaction.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 42,
          type: 'INCOME',
          ...dateFilter,
          linkedInvestmentEvents: {
            none: { eventType: 'WITHDRAWAL_PRINCIPAL', investment: { userId: 42 } },
          },
        },
        _sum: { amount: true },
      });
    });

    it.each([
      ['fromDate', '2026-10-01T00:00:00.000Z', { gte: new Date('2026-10-01T00:00:00.000Z') }],
      ['toDate', '2026-10-31T23:59:59.999Z', { lte: new Date('2026-10-31T23:59:59.999Z') }],
    ] as const)('uses only the supplied %s boundary', async (boundary, value, date) => {
      transaction.transaction.groupBy.mockResolvedValue([]);
      transaction.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await repository.getPeriodTypeTotals(42, boundary === 'fromDate' ? value : undefined, boundary === 'toDate' ? value : undefined);

      expect(transaction.transaction.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42, date } }));
      expect(transaction.transaction.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 42, date }) }));
    });

    it('omits date constraints and defaults nullable aggregate sums to zero', async () => {
      transaction.transaction.groupBy.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: null }, _count: { _all: 2 } },
        { type: 'EXPENSE', _sum: { amount: null }, _count: { _all: 1 } },
      ]);
      transaction.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await expect(repository.getPeriodTypeTotals(42)).resolves.toEqual([
        { type: 'INCOME', amount: 0, count: 2 },
        { type: 'EXPENSE', amount: 0, count: 1 },
      ]);
      expect(transaction.transaction.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 42 } }));
      expect(transaction.transaction.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 42,
          type: 'INCOME',
          linkedInvestmentEvents: {
            none: { eventType: 'WITHDRAWAL_PRINCIPAL', investment: { userId: 42 } },
          },
        },
        _sum: { amount: true },
      });
    });
  });

  describe('create', () => {
    it('normalizes optional references and dates before persisting, then updates the goal', async () => {
      const data = {
        type: 'INCOME',
        amount: 125,
        date: '2026-10-25T00:00:00.000Z',
        categoryId: '5',
        goalId: '4',
        sourceAccountId: '9',
        destinationAccountId: '0',
      };
      transaction.transaction.create.mockResolvedValue(
        transactionRow({ type: 'INCOME', amount: 125, goalId: 4 }),
      );

      await repository.create(data as never, 42);

      expect(transaction.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...data,
          userId: 42,
          date: new Date(data.date),
          categoryId: 5,
          goalId: 4,
          sourceAccountId: 9,
          destinationAccountId: null,
        }),
      });
      expect(transaction.goal.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { currentAmount: { increment: 125 } },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it('rejects an expense reference when its goal does not belong to the user', async () => {
      transaction.goal.findFirst.mockResolvedValue(null);

      await expect(
        repository.create({
          type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z', goalId: 4,
        } as never, 42),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transaction.transaction.create).not.toHaveBeenCalled();
    });

    it('applies an expense as a negative goal delta', async () => {
      transaction.transaction.create.mockResolvedValue(
        transactionRow({ type: 'EXPENSE', amount: 25, goalId: 4 }),
      );

      await repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z', goalId: 4,
      } as never, 42);

      expect(transaction.goal.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { currentAmount: { increment: -25 } },
      });
    });

    it('uses the supplied transaction instead of opening a nested transaction', async () => {
      transaction.transaction.create.mockResolvedValue(transactionRow());

      await repository.create({
        type: 'INCOME', amount: 25, date: '2026-10-25T00:00:00.000Z',
      } as never, 42, transaction as never);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(transaction.transaction.create).toHaveBeenCalled();
    });

    it('normalizes null, undefined and empty optional references to null', async () => {
      transaction.transaction.create.mockResolvedValue(transactionRow());

      await repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z',
        categoryId: null, goalId: '', sourceAccountId: undefined, destinationAccountId: null,
      } as never, 42);

      expect(transaction.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          categoryId: null,
          goalId: null,
          sourceAccountId: null,
          destinationAccountId: null,
        }),
      });
      expect(transaction.category.findFirst).not.toHaveBeenCalled();
      expect(transaction.goal.findFirst).not.toHaveBeenCalled();
      expect(transaction.financialAccount.findFirst).not.toHaveBeenCalled();
    });

    it('rejects malformed optional reference IDs before querying related records', async () => {
      await expect(repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z', categoryId: '1.5',
      } as never, 42)).rejects.toBeInstanceOf(BadRequestException);
      await expect(repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z', goalId: 'not-an-id',
      } as never, 42)).rejects.toBeInstanceOf(BadRequestException);
      await expect(repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z', sourceAccountId: '-1',
      } as never, 42)).rejects.toBeInstanceOf(BadRequestException);
      await expect(repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z', destinationAccountId: '2.5',
      } as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(transaction.transaction.create).not.toHaveBeenCalled();
      expect(transaction.category.findFirst).not.toHaveBeenCalled();
      expect(transaction.goal.findFirst).not.toHaveBeenCalled();
      expect(transaction.financialAccount.findFirst).not.toHaveBeenCalled();
    });

    it.each([
      ['categoryId', { categoryId: 5 }, 'category'],
      ['goalId', { goalId: 4 }, 'goal'],
      ['sourceAccountId', { sourceAccountId: 9 }, 'financialAccount'],
      ['destinationAccountId', { destinationAccountId: 10 }, 'financialAccount'],
    ] as const)('rejects a %s reference that is unavailable to the transaction owner', async (_field, reference, model) => {
      transaction[model].findFirst.mockResolvedValue(null);

      await expect(repository.create({
        type: 'EXPENSE', amount: 25, date: '2026-10-25T00:00:00.000Z', ...reference,
      } as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(transaction.transaction.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid transaction date before persisting', async () => {
      await expect(repository.create({
        type: 'INCOME', amount: 25, date: 'not-a-date',
      } as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(transaction.transaction.create).not.toHaveBeenCalled();
    });

    it('does not adjust a goal when a created transaction has no effective goal delta', async () => {
      transaction.transaction.create.mockResolvedValue(transactionRow({ type: 'INCOME', amount: 0, goalId: 4 }));

      await repository.create({
        type: 'INCOME', amount: 0, date: '2026-10-25T00:00:00.000Z', goalId: 4,
      } as never, 42);

      expect(transaction.goal.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns null without updating when the transaction is not owned by the user', async () => {
      transaction.transaction.findFirst.mockResolvedValue(null);

      await expect(repository.update(12, { notes: 'Updated' }, 42)).resolves.toBeNull();
      expect(transaction.transaction.update).not.toHaveBeenCalled();
    });

    it('adjusts a goal by the change in a linked income transaction', async () => {
      transaction.transaction.findFirst.mockResolvedValue(
        transactionRow({ goalId: 4, type: 'INCOME', amount: 100 }),
      );
      transaction.transaction.update.mockResolvedValue(
        transactionRow({ goalId: 4, type: 'INCOME', amount: 150 }),
      );

      await repository.update(12, { amount: 150 }, 42);

      expect(transaction.goal.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { currentAmount: { increment: 50 } },
      });
    });

    it('normalizes changed optional references and parses the supplied date', async () => {
      transaction.transaction.findFirst.mockResolvedValue(transactionRow());
      transaction.transaction.update.mockResolvedValue(transactionRow({
        goalId: null,
        sourceAccountId: null,
        destinationAccountId: 10,
        date: new Date('2026-11-01T00:00:00.000Z'),
        notes: null,
      }));

      await repository.update(12, {
        goalId: '',
        sourceAccountId: '',
        destinationAccountId: '10',
        date: '2026-11-01T00:00:00.000Z',
        notes: null,
      } as never, 42);

      expect(transaction.transaction.update).toHaveBeenCalledWith({
        where: { id: 12 },
        data: expect.objectContaining({
          goalId: null,
          sourceAccountId: null,
          destinationAccountId: 10,
          date: new Date('2026-11-01T00:00:00.000Z'),
          notes: null,
        }),
      });
    });

    it('reverses the old goal delta and applies the new signed delta when a transaction moves goals', async () => {
      transaction.transaction.findFirst.mockResolvedValue(transactionRow({ goalId: 4, type: 'INCOME', amount: 100 }));
      transaction.goal.findFirst.mockResolvedValue({ id: 5 });
      transaction.transaction.update.mockResolvedValue(transactionRow({ goalId: 5, type: 'EXPENSE', amount: 25 }));

      await repository.update(12, { goalId: 5, type: 'EXPENSE', amount: 25 } as never, 42);

      expect(transaction.goal.update.mock.calls).toEqual([
        [{ where: { id: 4 }, data: { currentAmount: { increment: -100 } } }],
        [{ where: { id: 5 }, data: { currentAmount: { increment: -25 } } }],
      ]);
    });

    it('reverses a linked goal when the transaction is unlinked', async () => {
      transaction.transaction.findFirst.mockResolvedValue(transactionRow({ goalId: 4, type: 'INCOME', amount: 100 }));
      transaction.transaction.update.mockResolvedValue(transactionRow({ goalId: null, type: 'INCOME', amount: 100 }));

      await repository.update(12, { goalId: null } as never, 42);

      expect(transaction.goal.update).toHaveBeenCalledExactlyOnceWith({
        where: { id: 4 },
        data: { currentAmount: { increment: -100 } },
      });
    });

    it('does not change a goal when an update leaves its financial contribution unchanged', async () => {
      const existing = transactionRow({ goalId: 4, type: 'INCOME', amount: 100 });
      transaction.transaction.findFirst.mockResolvedValue(existing);
      transaction.transaction.update.mockResolvedValue(existing);

      await repository.update(12, { notes: 'Updated note' }, 42);

      expect(transaction.goal.update).not.toHaveBeenCalled();
    });

    it.each([
      ['categoryId', { categoryId: 5 }, 'category'],
      ['goalId', { goalId: 4 }, 'goal'],
      ['sourceAccountId', { sourceAccountId: 9 }, 'financialAccount'],
      ['destinationAccountId', { destinationAccountId: 10 }, 'financialAccount'],
    ] as const)('rejects an updated %s reference that is unavailable to the user', async (_field, reference, model) => {
      transaction.transaction.findFirst.mockResolvedValue(transactionRow());
      transaction[model].findFirst.mockResolvedValue(null);

      await expect(repository.update(12, reference as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(transaction.transaction.update).not.toHaveBeenCalled();
    });

    it('applies a goal delta when an unlinked transaction is linked to a goal', async () => {
      transaction.transaction.findFirst.mockResolvedValue(transactionRow({ goalId: null, type: 'INCOME', amount: 60 }));
      transaction.goal.findFirst.mockResolvedValue({ id: 4 });
      transaction.transaction.update.mockResolvedValue(transactionRow({ goalId: 4, type: 'INCOME', amount: 60 }));

      await repository.update(12, { goalId: 4 } as never, 42);

      expect(transaction.goal.update).toHaveBeenCalledExactlyOnceWith({
        where: { id: 4 },
        data: { currentAmount: { increment: 60 } },
      });
    });

    it('rejects an invalid changed date before updating', async () => {
      transaction.transaction.findFirst.mockResolvedValue(transactionRow());

      await expect(repository.update(12, { date: 'not-a-date' } as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(transaction.transaction.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('does nothing when the transaction is not owned by the user', async () => {
      transaction.transaction.findFirst.mockResolvedValue(null);

      await expect(repository.delete(12, 42)).resolves.toBeUndefined();
      expect(transaction.transaction.delete).not.toHaveBeenCalled();
    });

    it('reverses the goal delta after deleting an income transaction', async () => {
      transaction.transaction.findFirst.mockResolvedValue(
        transactionRow({ goalId: 4, type: 'INCOME', amount: 80 }),
      );

      await repository.delete(12, 42);

      expect(transaction.transaction.delete).toHaveBeenCalledWith({ where: { id: 12 } });
      expect(transaction.goal.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: { currentAmount: { increment: -80 } },
      });
    });

    it('reverses a signed expense delta and skips goal mutation for unlinked transactions', async () => {
      transaction.transaction.findFirst
        .mockResolvedValueOnce(transactionRow({ goalId: 4, type: 'EXPENSE', amount: 30 }))
        .mockResolvedValueOnce(transactionRow({ goalId: null, type: 'EXPENSE', amount: 30 }));

      await repository.delete(12, 42);
      expect(transaction.goal.update).toHaveBeenCalledExactlyOnceWith({
        where: { id: 4 },
        data: { currentAmount: { increment: 30 } },
      });

      transaction.goal.update.mockClear();
      await repository.delete(13, 42);
      expect(transaction.goal.update).not.toHaveBeenCalled();
    });
  });

  describe('findByDateRange', () => {
    it('filters dates inclusively within the transaction owner', async () => {
      const startDate = new Date('2026-10-01T00:00:00.000Z');
      const endDate = new Date('2026-10-31T00:00:00.000Z');
      transaction.transaction.findMany.mockResolvedValue([transactionRow()]);

      await repository.findByDateRange(42, startDate, endDate);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: { gte: startDate, lte: endDate }, userId: 42 },
        }),
      );
    });
  });

  describe('findByType', () => {
    it('filters by type and owner', async () => {
      transaction.transaction.findMany.mockResolvedValue([transactionRow()]);

      await repository.findByType(42, 'EXPENSE');

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: 'EXPENSE', userId: 42 } }),
      );
    });
  });
});