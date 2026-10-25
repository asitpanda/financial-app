import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { FinancialAccountPrismaRepository } from './financial-account.prisma.repository';

function createRepository() {
  const prisma = {
    financialAccount: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: { groupBy: vi.fn() },
  };

  return {
    repository: new FinancialAccountPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

const accountRow = (overrides = {}) => ({
  id: 7,
  userId: 42,
  name: 'checking',
  displayName: 'Checking account',
  accountType: 'bank',
  institutionName: null,
  accountNumberMasked: null,
  currency: 'USD',
  isActive: true,
  openingBalance: new Prisma.Decimal('125.50'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('FinancialAccountPrismaRepository', () => {
  let repository: FinancialAccountPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('create', () => {
    it('converts opening balance to a Prisma decimal and maps the result to a number', async () => {
      const data = { name: 'checking', openingBalance: 125.5 };
      prisma.financialAccount.create.mockResolvedValue(accountRow());

      await expect(repository.create(data as never, '42')).resolves.toMatchObject({
        openingBalance: 125.5,
      });
      expect(prisma.financialAccount.create).toHaveBeenCalledWith({
        data: {
          ...data,
          openingBalance: new Prisma.Decimal('125.5'),
          userId: 42,
        },
      });
    });
  });

  describe('findAll', () => {
    it('scopes results to the owner, sorts newest first, and converts decimal balances', async () => {
      prisma.financialAccount.findMany.mockResolvedValue([accountRow()]);

      await expect(repository.findAll('42')).resolves.toMatchObject([
        { id: 7, openingBalance: 125.5 },
      ]);
      expect(prisma.financialAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('looks up the account within its owner and returns null when absent', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue(null);

      await expect(repository.findOne('7', '42')).resolves.toBeNull();
      expect(prisma.financialAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
      });
    });
  });

  describe('update', () => {
    it('updates only an account owned by the requester', async () => {
      const data = { displayName: 'Primary checking' };
      prisma.financialAccount.findFirst.mockResolvedValue(accountRow());
      prisma.financialAccount.update.mockResolvedValue(accountRow(data));

      await expect(repository.update('7', data as never, '42')).resolves.toMatchObject(data);
      expect(prisma.financialAccount.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data,
      });
    });

    it('returns null without updating an account that is not owned by the requester', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue(null);

      await expect(repository.update('7', {}, '42')).resolves.toBeNull();
      expect(prisma.financialAccount.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes only after confirming account ownership', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue(accountRow());
      prisma.financialAccount.delete.mockResolvedValue(accountRow());

      await expect(repository.delete('7', '42')).resolves.toBeUndefined();
      expect(prisma.financialAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
      });
      expect(prisma.financialAccount.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    it('does nothing when the account is not owned by the requester', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue(null);

      await expect(repository.delete('7', '42')).resolves.toBeUndefined();
      expect(prisma.financialAccount.delete).not.toHaveBeenCalled();
    });
  });

  describe('sumTransactionFlows', () => {
    it('returns an empty map without querying transactions for no accounts', async () => {
      await expect(repository.sumTransactionFlows([])).resolves.toEqual(new Map());
      expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
    });

    it('sums eligible incoming and outgoing transactions by account', async () => {
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          { destinationAccountId: 7, _sum: { amount: 125 } },
          { destinationAccountId: null, _sum: { amount: 900 } },
        ])
        .mockResolvedValueOnce([
          { sourceAccountId: 8, _sum: { amount: 40 } },
          { sourceAccountId: null, _sum: { amount: 900 } },
        ]);

      await expect(repository.sumTransactionFlows([7, 8])).resolves.toEqual(
        new Map([
          [7, { incoming: 125, outgoing: 0 }],
          [8, { incoming: 0, outgoing: 40 }],
        ]),
      );
      expect(prisma.transaction.groupBy).toHaveBeenNthCalledWith(1, {
        by: ['destinationAccountId'],
        where: {
          destinationAccountId: { in: [7, 8] },
          type: { in: ['INCOME', 'TRANSFER', 'INVESTMENT'] },
        },
        _sum: { amount: true },
      });
      expect(prisma.transaction.groupBy).toHaveBeenNthCalledWith(2, {
        by: ['sourceAccountId'],
        where: {
          sourceAccountId: { in: [7, 8] },
          type: { in: ['EXPENSE', 'TRANSFER', 'INVESTMENT'] },
        },
        _sum: { amount: true },
      });
    });
  });
});