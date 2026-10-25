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
    $transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(transaction)),
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