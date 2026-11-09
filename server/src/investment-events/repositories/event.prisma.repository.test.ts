import { BadRequestException, ConflictException } from '@nestjs/common';
import { InvestmentEventType, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { syncInvestmentDerivedValues } from '../../investments/repositories/investment-valuation';
import { EventPrismaRepository } from './event.prisma.repository';

vi.mock('../../investments/repositories/investment-valuation', () => ({
  syncInvestmentDerivedValues: vi.fn(),
}));

function createRepository() {
  const prisma = {
    investment: {
      findUnique: vi.fn().mockResolvedValue({ totalInvested: 0 }),
    },
    transaction: {
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    financialAccount: {
      findUnique: vi.fn().mockResolvedValue({ openingBalance: 0 }),
    },
    investmentEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    repository: new EventPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    investmentId: 7,
    recurringPlanId: null,
    linkedTransactionId: null,
    linkedBenefitId: null,
    eventType: InvestmentEventType.CONTRIBUTION,
    dueDate: null,
    status: 'CONFIRMED',
    eventSource: 'MANUAL',
    sequenceNumber: null,
    eventDate: new Date('2026-10-25T00:00:00.000Z'),
    amount: new Prisma.Decimal('123.45'),
    units: null,
    pricePerUnit: null,
    netAmount: null,
    notes: null,
    meta: null,
    createdAt: new Date('2026-10-25T00:00:00.000Z'),
    updatedAt: new Date('2026-10-25T00:00:00.000Z'),
    ...overrides,
  };
}

describe('EventPrismaRepository', () => {
  let repository: EventPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
    vi.mocked(syncInvestmentDerivedValues).mockClear();
  });

  describe('create', () => {
    it('normalizes persistence values and maps decimal output', async () => {
      const data = {
        investmentId: '7',
        recurringPlanId: '8',
        linkedTransactionId: '9',
        eventType: InvestmentEventType.CONTRIBUTION,
        dueDate: '2026-11-25T00:00:00.000Z',
        eventDate: '2026-10-25T00:00:00.000Z',
        amount: 123.45,
        units: 1.25,
        pricePerUnit: 98.76,
        netAmount: 123.4,
        meta: { channel: 'import' },
      };
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findFirst.mockResolvedValue(null);
      prisma.investmentEvent.create.mockResolvedValue(
        eventRow({
          amount: new Prisma.Decimal('123.45'),
          units: 1.25,
          pricePerUnit: new Prisma.Decimal('98.76'),
          netAmount: new Prisma.Decimal('123.4'),
        }),
      );

      await expect(repository.create(data as never)).resolves.toMatchObject({
        investmentId: 7,
        amount: 123.45,
        units: 1.25,
        pricePerUnit: 98.76,
        netAmount: 123.4,
      });
      expect(prisma.investmentEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investmentId: 7,
          recurringPlanId: 8,
          linkedTransactionId: 9,
          dueDate: new Date(data.dueDate),
          eventDate: new Date(data.eventDate),
          amount: new Prisma.Decimal('123.45'),
          units: 1.25,
          pricePerUnit: new Prisma.Decimal('98.76'),
          netAmount: new Prisma.Decimal('123.4'),
          meta: data.meta,
        }),
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
      expect(syncInvestmentDerivedValues).toHaveBeenCalledWith(prisma, 7);
    });

    it('uses the supplied transaction without opening a nested transaction', async () => {
      const transaction = {
        investmentEvent: {
          create: vi.fn().mockResolvedValue(eventRow()),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      };
      const data = {
        investmentId: '7',
        eventType: InvestmentEventType.CONTRIBUTION,
        eventDate: '2026-10-25T00:00:00.000Z',
      };

      await repository.create(data as never, transaction as never);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(transaction.investmentEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ investmentId: 7 }),
      });
      expect(syncInvestmentDerivedValues).toHaveBeenCalledWith(transaction, 7);
    });

    it('updates a pending scheduled event instead of creating a duplicate', async () => {
      const scheduled = eventRow({ id: 11, status: 'PENDING' });
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findFirst.mockResolvedValue(scheduled);
      prisma.investmentEvent.update.mockResolvedValue(eventRow({ id: 11, status: 'CONFIRMED' }));

      await repository.create({
        investmentId: '7',
        recurringPlanId: '8',
        dueDate: '2026-11-25T00:00:00.000Z',
        eventType: InvestmentEventType.CONTRIBUTION,
        eventDate: '2026-10-25T00:00:00.000Z',
        status: 'CONFIRMED',
      } as never);

      expect(prisma.investmentEvent.update).toHaveBeenCalledWith({
        where: { id: 11 },
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      });
      expect(prisma.investmentEvent.create).not.toHaveBeenCalled();
    });

    it('rejects a scheduled payment that has already been confirmed', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findFirst.mockResolvedValue(eventRow({ status: 'CONFIRMED' }));

      await expect(
        repository.create({
          investmentId: '7',
          recurringPlanId: '8',
          dueDate: '2026-11-25T00:00:00.000Z',
          eventType: InvestmentEventType.CONTRIBUTION,
          eventDate: '2026-10-25T00:00:00.000Z',
          status: 'CONFIRMED',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.investmentEvent.create).not.toHaveBeenCalled();
      expect(prisma.investmentEvent.update).not.toHaveBeenCalled();
      expect(syncInvestmentDerivedValues).not.toHaveBeenCalled();
    });

    it('rejects invalid event dates before persisting', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );

      await expect(
        repository.create({
          investmentId: '7',
          eventType: InvestmentEventType.CONTRIBUTION,
          eventDate: 'not-a-date',
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.investmentEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('filters by investment owner, orders newest events first, and maps decimals', async () => {
      prisma.investmentEvent.findMany.mockResolvedValue([eventRow()]);

      await expect(repository.findAll(42)).resolves.toMatchObject([{ amount: 123.45 }]);
      expect(prisma.investmentEvent.findMany).toHaveBeenCalledWith({
        where: { investment: { userId: 42 } },
        orderBy: [{ eventDate: 'desc' }, { id: 'desc' }],
      });
    });
  });

  describe('findAllByInvestment', () => {
    it('filters by numeric investment ID and orders by event date', async () => {
      prisma.investmentEvent.findMany.mockResolvedValue([eventRow()]);

      await expect(repository.findAllByInvestment('7')).resolves.toMatchObject([{ amount: 123.45 }]);
      expect(prisma.investmentEvent.findMany).toHaveBeenCalledWith({
        where: { investmentId: 7 },
        orderBy: { eventDate: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns null when the event does not exist', async () => {
      prisma.investmentEvent.findUnique.mockResolvedValue(null);

      await expect(repository.findOne('3')).resolves.toBeNull();
      expect(prisma.investmentEvent.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
    });

    it('maps decimal values and missing linked benefit IDs', async () => {
      prisma.investmentEvent.findUnique.mockResolvedValue(
        eventRow({ linkedBenefitId: undefined, amount: new Prisma.Decimal('123.45') }),
      );

      await expect(repository.findOne('3')).resolves.toMatchObject({
        id: 3,
        linkedBenefitId: null,
        amount: 123.45,
      });
    });
  });

  describe('update', () => {
    it('normalizes changed fields and synchronizes both investments when moving an event', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findUnique.mockResolvedValue(eventRow({ investmentId: 7 }));
      prisma.investmentEvent.update.mockResolvedValue(
        eventRow({ investmentId: 8, eventDate: new Date('2027-01-01T00:00:00.000Z'), amount: new Prisma.Decimal('0') }),
      );

      await expect(
        repository.update('3', {
          investmentId: '8',
          eventDate: '2027-01-01T00:00:00.000Z',
          amount: 0,
          recurringPlanId: '',
        } as never),
      ).resolves.toMatchObject({ investmentId: 8, amount: 0 });
      expect(prisma.investmentEvent.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({
          investmentId: 8,
          eventDate: new Date('2027-01-01T00:00:00.000Z'),
          amount: new Prisma.Decimal(0),
          recurringPlanId: null,
        }),
      });
      expect(syncInvestmentDerivedValues).toHaveBeenNthCalledWith(1, prisma, 7);
      expect(syncInvestmentDerivedValues).toHaveBeenNthCalledWith(2, prisma, 8);
    });

    it('synchronizes linked transaction amounts and checks the affected source balance', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findUnique.mockResolvedValue(eventRow({ linkedTransactionId: 31 }));
      prisma.investmentEvent.update.mockResolvedValue(eventRow({ amount: new Prisma.Decimal(150) }));
      prisma.transaction.update.mockResolvedValue({
        goalId: null,
        sourceAccountId: 4,
        destinationAccountId: null,
      });
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(200) } });

      await repository.update('3', { amount: 150 } as never);

      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 31 },
        data: { amount: 150, date: undefined, notes: undefined },
      });
      expect(prisma.financialAccount.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
      expect(prisma.transaction.aggregate).toHaveBeenCalledWith(expect.objectContaining({
        where: { sourceAccountId: 4, type: { in: ['EXPENSE', 'TRANSFER', 'INVESTMENT'] } },
      }));
    });

    it('rejects a linked transaction correction that would leave principal below zero', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findUnique.mockResolvedValue(eventRow());
      prisma.investmentEvent.update.mockResolvedValue(eventRow({ investmentId: 7 }));
      prisma.investment.findUnique.mockResolvedValue({ totalInvested: -1 });

      await expect(repository.update('3', { amount: 100 } as never)).rejects.toThrow(
        'This correction would leave withdrawals greater than invested principal.',
      );
    });

    it('rejects edits to a linked transaction that belongs to a goal workflow', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findUnique.mockResolvedValue(eventRow({ linkedTransactionId: 31 }));
      prisma.investmentEvent.update.mockResolvedValue(eventRow());
      prisma.transaction.update.mockResolvedValue({ goalId: 5, sourceAccountId: null, destinationAccountId: null });

      await expect(repository.update('3', { notes: 'updated' } as never)).rejects.toThrow(
        'Goal-linked activity must be managed through its owning workflow.',
      );
      expect(prisma.transaction.aggregate).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the event and synchronizes its investment in one transaction', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findUnique.mockResolvedValue(eventRow());

      await expect(repository.delete('3')).resolves.toBeUndefined();

      expect(prisma.investmentEvent.findUnique).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(prisma.investmentEvent.delete).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(syncInvestmentDerivedValues).toHaveBeenCalledWith(prisma, 7);
    });

    it('does not synchronize an investment when the event lookup returns no row', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findUnique.mockResolvedValue(null);

      await repository.delete('3');

      expect(syncInvestmentDerivedValues).not.toHaveBeenCalled();
      expect(prisma.investmentEvent.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    });

    it('deletes a linked transaction and rejects goal-owned activity', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentEvent.findUnique.mockResolvedValue(eventRow({ linkedTransactionId: 31 }));
      prisma.transaction.delete.mockResolvedValue({
        goalId: null,
        destinationAccountId: 4,
      });
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 10 } });

      await repository.delete('3');

      expect(prisma.transaction.delete).toHaveBeenCalledWith({ where: { id: 31 } });
      expect(prisma.financialAccount.findUnique).toHaveBeenCalledWith({ where: { id: 4 } });
      expect(prisma.transaction.aggregate).toHaveBeenCalledTimes(2);

      prisma.investmentEvent.findUnique.mockResolvedValue(eventRow({ linkedTransactionId: 32 }));
      prisma.transaction.delete.mockResolvedValue({ goalId: 5, destinationAccountId: null });
      await expect(repository.delete('3')).rejects.toThrow(
        'Goal-linked activity must be managed through its owning workflow.',
      );
    });
  });
});