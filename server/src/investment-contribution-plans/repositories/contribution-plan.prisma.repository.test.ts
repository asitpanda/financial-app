import { InvestmentEventType, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { ContributionPlanPrismaRepository } from './contribution-plan.prisma.repository';

function createRepository() {
  const prisma = {
    investmentContributionPlan: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    investmentEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    investment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    valuationSnapshot: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };

  return {
    repository: new ContributionPlanPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

function planRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    investmentId: 5,
    status: 'active',
    amount: new Prisma.Decimal(100),
    cadenceUnit: 'month',
    cadenceInterval: 1,
    historicalImportMode: 'TRACK_FROM_TODAY',
    anchorDate: new Date('2026-01-01T00:00:00.000Z'),
    lastGeneratedDueDate: null,
    nextDueDate: null,
    endDate: null,
    reminderDaysBefore: null,
    autoCreateEvent: false,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ContributionPlanPrismaRepository', () => {
  let repository: ContributionPlanPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('create', () => {
    it('converts identifiers, decimal amounts, and date inputs before persistence', async () => {
      const anchorDate = '2026-01-15T00:00:00.000Z';
      prisma.investmentContributionPlan.create.mockResolvedValue(
        planRow({ anchorDate, amount: new Prisma.Decimal(125.5) }),
      );

      await expect(repository.create({
        investmentId: '5',
        status: 'active',
        amount: 125.5,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate,
      } as never)).resolves.toMatchObject({ investmentId: 5, amount: 125.5 });
      expect(prisma.investmentContributionPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investmentId: 5,
          amount: new Prisma.Decimal(125.5),
          anchorDate: new Date(anchorDate),
          endDate: null,
        }),
      });
    });
  });

  describe('findAllByInvestment', () => {
    it('filters by investment ID, orders by due date, and maps decimal amounts', async () => {
      prisma.investmentContributionPlan.findMany.mockResolvedValue([planRow()]);

      await expect(repository.findAllByInvestment('5')).resolves.toMatchObject([{ id: 7, amount: 100 }]);
      expect(prisma.investmentContributionPlan.findMany).toHaveBeenCalledWith({
        where: { investmentId: 5 },
        orderBy: { nextDueDate: 'asc' },
      });
    });
  });

  describe('findAllByInvestmentIds', () => {
    it('avoids a database query when no investment IDs are requested', async () => {
      await expect(repository.findAllByInvestmentIds([])).resolves.toEqual([]);
      expect(prisma.investmentContributionPlan.findMany).not.toHaveBeenCalled();
    });

    it('filters and orders plans for the requested investment IDs', async () => {
      prisma.investmentContributionPlan.findMany.mockResolvedValue([planRow()]);

      await expect(repository.findAllByInvestmentIds([5, 6])).resolves.toMatchObject([{ id: 7, amount: 100 }]);
      expect(prisma.investmentContributionPlan.findMany).toHaveBeenCalledWith({
        where: { investmentId: { in: [5, 6] } },
        orderBy: [{ investmentId: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      });
    });
  });

  describe('findAllByUser', () => {
    it('scopes plans through the owning investment and orders recent updates first', async () => {
      prisma.investmentContributionPlan.findMany.mockResolvedValue([planRow()]);

      await expect(repository.findAllByUser(42)).resolves.toMatchObject([{ id: 7, amount: 100 }]);
      expect(prisma.investmentContributionPlan.findMany).toHaveBeenCalledWith({
        where: { investment: { userId: 42 } },
        orderBy: [{ investmentId: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      });
    });
  });

  describe('findAllActiveByUser', () => {
    it('requires both the plan and its investment to be active', async () => {
      prisma.investmentContributionPlan.findMany.mockResolvedValue([planRow()]);

      await expect(repository.findAllActiveByUser(42)).resolves.toMatchObject([{ id: 7, amount: 100 }]);
      expect(prisma.investmentContributionPlan.findMany).toHaveBeenCalledWith({
        where: { status: 'active', investment: { userId: 42, status: 'active' } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      });
    });
  });

  describe('findOne', () => {
    it('uses the supplied transaction client and maps decimal amounts', async () => {
      const transaction = {
        investmentContributionPlan: { findUnique: vi.fn().mockResolvedValue(planRow()) },
      };

      await expect(repository.findOne('7', transaction as never)).resolves.toMatchObject({ amount: 100 });
      expect(transaction.investmentContributionPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 7 },
      });
      expect(prisma.investmentContributionPlan.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when the plan is absent', async () => {
      prisma.investmentContributionPlan.findUnique.mockResolvedValue(null);

      await expect(repository.findOne('404')).resolves.toBeNull();
      expect(prisma.investmentContributionPlan.findUnique).toHaveBeenCalledWith({ where: { id: 404 } });
    });
  });

  describe('findActiveByInvestment', () => {
    it('returns the most recently updated active plan or null', async () => {
      prisma.investmentContributionPlan.findFirst
        .mockResolvedValueOnce(planRow())
        .mockResolvedValueOnce(null);

      await expect(repository.findActiveByInvestment('5')).resolves.toMatchObject({ id: 7, amount: 100 });
      await expect(repository.findActiveByInvestment('9')).resolves.toBeNull();
      expect(prisma.investmentContributionPlan.findFirst).toHaveBeenNthCalledWith(1, {
        where: { investmentId: 5, status: 'active' },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('delete', () => {
    it('deletes the plan by its numeric ID', async () => {
      prisma.investmentContributionPlan.delete.mockResolvedValue(planRow());

      await expect(repository.delete('7')).resolves.toBeUndefined();
      expect(prisma.investmentContributionPlan.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });

  describe('update', () => {
    it('normalizes changed fields through the supplied transaction client', async () => {
      const transaction = {
        investmentContributionPlan: {
          update: vi.fn().mockResolvedValue(planRow({ amount: new Prisma.Decimal(175) })),
        },
      };

      await expect(repository.update('7', {
        amount: '175',
        anchorDate: '2026-02-01T00:00:00.000Z',
      } as never, transaction as never)).resolves.toMatchObject({ amount: 175 });
      expect(transaction.investmentContributionPlan.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({
          amount: new Prisma.Decimal(175),
          anchorDate: new Date('2026-02-01T00:00:00.000Z'),
        }),
      });
      expect(prisma.investmentContributionPlan.update).not.toHaveBeenCalled();
    });
  });

  describe('createPlanWithHistoricalEvents', () => {
    it('creates the plan and selected events within a serializable transaction', async () => {
      const transaction = {
        investment: {
          findFirst: vi.fn().mockResolvedValue({
            accountingTreatmentOverride: null,
            assetCategoryRef: null,
            assetTypeRef: null,
          }),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        investmentContributionPlan: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(planRow()),
        },
        investmentEvent: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: 12,
            investmentId: 5,
            recurringPlanId: 7,
            linkedTransactionId: null,
            linkedBenefitId: null,
            eventType: InvestmentEventType.CONTRIBUTION,
            dueDate: new Date('2026-01-15T00:00:00.000Z'),
            status: 'CONFIRMED',
            eventSource: 'HISTORICAL_IMPORT',
            sequenceNumber: 1,
            eventDate: new Date('2026-01-15T00:00:00.000Z'),
            amount: new Prisma.Decimal(50),
            units: null,
            pricePerUnit: null,
            netAmount: null,
            notes: null,
            meta: null,
            createdAt: new Date('2026-01-15T00:00:00.000Z'),
            updatedAt: new Date('2026-01-15T00:00:00.000Z'),
          }),
        },
      };
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      );

      const result = await repository.createPlanWithHistoricalEvents({
        investmentId: '5',
        userId: 42,
        planPayload: {
          investmentId: '5',
          status: 'active',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [
          {
            dueDate: '2026-01-15',
            amount: 50,
            selected: true,
            status: 'CONFIRMED',
            eventType: InvestmentEventType.CONTRIBUTION,
          } as never,
        ],
      });

      expect(result.plan.amount).toBe(100);
      expect(result.historicalEvents).toMatchObject([{ id: 12, amount: 50, eventType: InvestmentEventType.CONTRIBUTION }]);
      expect(transaction.investmentContributionPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ investmentId: 5, amount: new Prisma.Decimal(100) }),
      });
      expect(transaction.investmentEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investmentId: 5,
          recurringPlanId: 7,
          amount: new Prisma.Decimal(50),
          eventType: InvestmentEventType.CONTRIBUTION,
        }),
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('rejects creation when the investment does not belong to the user', async () => {
      const transaction = {
        investment: { findFirst: vi.fn().mockResolvedValue(null) },
        investmentContributionPlan: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
        investmentEvent: { findFirst: vi.fn(), create: vi.fn() },
      };
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      );

      await expect(repository.createPlanWithHistoricalEvents({
        investmentId: '5',
        userId: 999,
        planPayload: {
          investmentId: '5',
          status: 'paused',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [],
      })).rejects.toThrow('Investment not found');
      expect(transaction.investmentContributionPlan.create).not.toHaveBeenCalled();
    });

    it('rejects a second active plan before persisting it', async () => {
      const transaction = {
        investment: {
          findFirst: vi.fn().mockResolvedValue({
            accountingTreatmentOverride: null,
            assetCategoryRef: null,
            assetTypeRef: null,
          }),
        },
        investmentContributionPlan: {
          findFirst: vi.fn().mockResolvedValue(planRow()),
          create: vi.fn(),
        },
        investmentEvent: { findFirst: vi.fn(), create: vi.fn() },
      };
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      );

      await expect(repository.createPlanWithHistoricalEvents({
        investmentId: '5',
        userId: 42,
        planPayload: {
          investmentId: '5',
          status: 'active',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [],
      })).rejects.toThrow('An active recurring plan already exists for this investment');
      expect(transaction.investmentContributionPlan.create).not.toHaveBeenCalled();
    });

    it('uses a supplied transaction and maps selected events by accounting treatment', async () => {
      const eventDate = new Date('2026-01-15T00:00:00.000Z');
      const transaction = {
        investment: {
          findFirst: vi.fn().mockResolvedValue({
            accountingTreatmentOverride: 'PROTECTION_EXPENSE',
            assetCategoryRef: null,
            assetTypeRef: null,
          }),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        investmentContributionPlan: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(planRow()),
        },
        investmentEvent: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValueOnce({
            id: 21,
            investmentId: 5,
            recurringPlanId: 7,
            linkedTransactionId: null,
            linkedBenefitId: null,
            eventType: InvestmentEventType.PREMIUM,
            dueDate: eventDate,
            status: 'CONFIRMED',
            eventSource: 'HISTORICAL_IMPORT',
            sequenceNumber: 1,
            eventDate,
            amount: new Prisma.Decimal(100),
            units: null,
            pricePerUnit: null,
            netAmount: null,
            notes: null,
            meta: { reviewed: true },
            createdAt: eventDate,
            updatedAt: eventDate,
          }).mockResolvedValueOnce({
            id: 22,
            investmentId: 5,
            recurringPlanId: 7,
            linkedTransactionId: null,
            linkedBenefitId: null,
            eventType: InvestmentEventType.OPENING_BALANCE,
            dueDate: new Date('2026-01-16T00:00:00.000Z'),
            status: 'PENDING',
            eventSource: 'MANUAL',
            sequenceNumber: 2,
            eventDate: new Date('2026-01-16T00:00:00.000Z'),
            amount: new Prisma.Decimal(100),
            units: null,
            pricePerUnit: null,
            netAmount: null,
            notes: null,
            meta: null,
            createdAt: eventDate,
            updatedAt: eventDate,
          }),
        },
      };

      await expect(repository.createPlanWithHistoricalEvents({
        investmentId: '5',
        userId: 42,
        planPayload: {
          investmentId: '5',
          status: 'paused',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [
          {
            dueDate: '2026-01-15',
            selected: true,
            status: 'CONFIRMED',
            eventType: InvestmentEventType.CONTRIBUTION,
            meta: { reviewed: true },
          } as never,
          {
            dueDate: '2026-01-16',
            selected: true,
            eventType: InvestmentEventType.OPENING_BALANCE,
          } as never,
          { selected: true, eventType: InvestmentEventType.CONTRIBUTION } as never,
          { dueDate: '2026-01-17', selected: false, eventType: InvestmentEventType.CONTRIBUTION } as never,
        ],
      }, transaction as never)).resolves.toMatchObject({
        historicalEvents: [
          { eventType: InvestmentEventType.PREMIUM, amount: 100, meta: { reviewed: true } },
          {
            eventType: InvestmentEventType.OPENING_BALANCE,
            amount: 100,
            eventSource: 'MANUAL',
            sequenceNumber: 2,
          },
        ],
      });

      expect(transaction.investmentEvent.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          eventType: InvestmentEventType.PREMIUM,
          eventSource: 'HISTORICAL_IMPORT',
          eventDate,
          amount: new Prisma.Decimal(100),
          meta: { reviewed: true },
        }),
      });
      expect(transaction.investmentEvent.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          eventType: InvestmentEventType.OPENING_BALANCE,
          eventSource: 'MANUAL',
          sequenceNumber: 2,
        }),
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a duplicate selected historical event before creating it', async () => {
      const transaction = {
        investment: { findFirst: vi.fn().mockResolvedValue({ accountingTreatmentOverride: null }) },
        investmentContributionPlan: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(planRow()),
        },
        investmentEvent: {
          findFirst: vi.fn().mockResolvedValue({ id: 22 }),
          create: vi.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      );

      await expect(repository.createPlanWithHistoricalEvents({
        investmentId: '5',
        userId: 42,
        planPayload: {
          investmentId: '5',
          status: 'paused',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [{
          dueDate: '2026-01-15',
          selected: true,
          eventType: InvestmentEventType.CONTRIBUTION,
        } as never],
      })).rejects.toThrow('Duplicate recurring event');
      expect(transaction.investmentEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('generateDueRecurringInvestmentEvents', () => {
    it('generates inclusive monthly occurrences and advances beyond the cutoff', async () => {
      const plan = planRow({
        id: 8,
        nextDueDate: new Date('2026-01-31T00:00:00.000Z'),
        anchorDate: new Date('2026-01-31T00:00:00.000Z'),
        investment: { accountingTreatmentOverride: null, assetCategoryRef: null, assetTypeRef: null },
      });
      prisma.investmentContributionPlan.findMany.mockResolvedValue([plan]);
      prisma.investmentEvent.findFirst.mockResolvedValue(null);
      prisma.investmentEvent.create.mockResolvedValue({});
      vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await expect(
        repository.generateDueRecurringInvestmentEvents({
          cutoffDate: new Date('2026-03-31T00:00:00.000Z'),
        }),
      ).resolves.toEqual({ processedPlans: 1, generatedEvents: 3 });

      expect(prisma.investmentEvent.create).toHaveBeenCalledTimes(3);
      expect(prisma.investmentContributionPlan.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: {
          nextDueDate: new Date('2026-04-30T00:00:00.000Z'),
          lastGeneratedDueDate: new Date('2026-03-31T00:00:00.000Z'),
        },
      });
    });

    it('does not duplicate existing events and clears the next date after the plan end date', async () => {
      const plan = planRow({
        id: 9,
        nextDueDate: new Date('2026-01-31T00:00:00.000Z'),
        anchorDate: new Date('2026-01-31T00:00:00.000Z'),
        endDate: new Date('2026-02-28T00:00:00.000Z'),
        investment: { accountingTreatmentOverride: null, assetCategoryRef: null, assetTypeRef: null },
      });
      prisma.investmentContributionPlan.findMany.mockResolvedValue([plan]);
      prisma.investmentEvent.findFirst
        .mockResolvedValueOnce({ id: 20 })
        .mockResolvedValueOnce(null);
      prisma.investmentEvent.create.mockResolvedValue({});
      vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await expect(repository.generateDueRecurringInvestmentEvents({
        cutoffDate: new Date('2026-03-31T00:00:00.000Z'),
      })).resolves.toEqual({ processedPlans: 1, generatedEvents: 1 });

      expect(prisma.investmentEvent.create).toHaveBeenCalledOnce();
      expect(prisma.investmentContributionPlan.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: {
          nextDueDate: null,
          lastGeneratedDueDate: new Date('2026-02-28T00:00:00.000Z'),
        },
      });
    });

    it('generates premium events for investments with a non-investment treatment', async () => {
      prisma.investmentContributionPlan.findMany.mockResolvedValue([planRow({
        nextDueDate: new Date('2026-02-01T00:00:00.000Z'),
        investment: {
          accountingTreatmentOverride: 'PROTECTION_EXPENSE',
          assetCategoryRef: null,
          assetTypeRef: null,
        },
      })]);
      prisma.investmentEvent.findFirst.mockResolvedValue(null);
      prisma.investmentEvent.create.mockResolvedValue({});
      vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await repository.generateDueRecurringInvestmentEvents({
        cutoffDate: new Date('2026-02-01T00:00:00.000Z'),
      });

      expect(prisma.investmentEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eventType: InvestmentEventType.PREMIUM }),
      });
    });
  });

  describe('skipCurrentContribution', () => {
    it('creates a premium skip record and advances the next due date transactionally', async () => {
      const eventDate = new Date('2026-02-01T00:00:00.000Z');
      const transaction = {
        investmentContributionPlan: {
          findUnique: vi.fn().mockResolvedValue(planRow()),
          update: vi.fn().mockResolvedValue(planRow({ nextDueDate: new Date('2026-03-01T00:00:00.000Z') })),
        },
        investment: {
          findFirst: vi.fn().mockResolvedValue({
            accountingTreatmentOverride: 'PROTECTION_EXPENSE',
            assetCategoryRef: null,
            assetTypeRef: null,
          }),
        },
        investmentEvent: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: 12,
            investmentId: 5,
            recurringPlanId: 7,
            linkedTransactionId: null,
            linkedBenefitId: null,
            eventType: InvestmentEventType.PREMIUM,
            dueDate: eventDate,
            status: 'SKIPPED',
            eventSource: 'RECURRING_PLAN',
            sequenceNumber: null,
            eventDate,
            amount: new Prisma.Decimal(100),
            units: null,
            pricePerUnit: null,
            netAmount: null,
            notes: 'Skipped scheduled contribution',
            meta: null,
            createdAt: eventDate,
            updatedAt: eventDate,
          }),
        },
      };
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      );

      const result = await repository.skipCurrentContribution({
        investmentId: '5',
        planId: '7',
        userId: 42,
        dueDate: '2026-02-01',
        nextDueDate: '2026-03-01',
      } as never);

      expect(result).toMatchObject({
        plan: { id: 7, nextDueDate: new Date('2026-03-01T00:00:00.000Z') },
        skippedEvent: { id: 12, eventType: InvestmentEventType.PREMIUM, amount: 100, status: 'SKIPPED' },
      });
      expect(transaction.investmentEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investmentId: 5,
          recurringPlanId: 7,
          eventType: InvestmentEventType.PREMIUM,
          dueDate: eventDate,
          amount: new Prisma.Decimal(100),
        }),
      });
      expect(prisma.investmentContributionPlan.update).not.toHaveBeenCalled();
    });

    it('marks an existing pending event as skipped with trimmed notes', async () => {
      const eventDate = new Date('2026-02-01T00:00:00.000Z');
      const transaction = {
        investmentContributionPlan: {
          findUnique: vi.fn().mockResolvedValue(planRow()),
          update: vi.fn().mockResolvedValue(planRow()),
        },
        investment: {
          findFirst: vi.fn().mockResolvedValue({
            accountingTreatmentOverride: null,
            assetCategoryRef: null,
            assetTypeRef: null,
          }),
        },
        investmentEvent: {
          findFirst: vi.fn().mockResolvedValue({ id: 20, status: 'EXPECTED' }),
          update: vi.fn().mockResolvedValue({
            id: 20,
            investmentId: 5,
            recurringPlanId: 7,
            linkedTransactionId: null,
            linkedBenefitId: null,
            eventType: InvestmentEventType.CONTRIBUTION,
            dueDate: eventDate,
            status: 'SKIPPED',
            eventSource: 'HISTORICAL_IMPORT',
            sequenceNumber: 1,
            eventDate,
            amount: new Prisma.Decimal(100),
            units: null,
            pricePerUnit: null,
            netAmount: null,
            notes: 'postponed',
            meta: null,
            createdAt: eventDate,
            updatedAt: eventDate,
          }),
          create: vi.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      );

      const result = await repository.skipCurrentContribution({
        investmentId: '5',
        planId: '7',
        userId: 42,
        dueDate: '2026-02-01',
        notes: '  postponed  ',
      } as never);

      expect(result.skippedEvent).toMatchObject({ id: 20, status: 'SKIPPED', notes: 'postponed' });
      expect(transaction.investmentEvent.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { status: 'SKIPPED', notes: 'postponed' },
      });
      expect(transaction.investmentEvent.create).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing plan', null, { accountingTreatmentOverride: null }, null, 'Recurring plan not found'],
      ['a plan for another investment', planRow({ investmentId: 6 }), { accountingTreatmentOverride: null }, null, 'Recurring plan not found'],
      ['an investment outside the user', planRow(), null, null, 'Investment not found'],
      ['a confirmed contribution', planRow(), { accountingTreatmentOverride: null }, { status: 'CONFIRMED' }, 'This due contribution is already recorded as paid'],
      ['a previously skipped contribution', planRow(), { accountingTreatmentOverride: null }, { status: 'SKIPPED' }, 'This due contribution was already skipped'],
    ])('rejects a skip for %s', async (_scenario, plan, investment, existingEvent, message) => {
      const transaction = {
        investmentContributionPlan: {
          findUnique: vi.fn().mockResolvedValue(plan),
          update: vi.fn(),
        },
        investment: { findFirst: vi.fn().mockResolvedValue(investment) },
        investmentEvent: {
          findFirst: vi.fn().mockResolvedValue(existingEvent),
          create: vi.fn(),
          update: vi.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(transaction),
      );

      await expect(repository.skipCurrentContribution({
        investmentId: '5',
        planId: '7',
        userId: 42,
        dueDate: '2026-02-01',
      } as never)).rejects.toThrow(message);
      expect(transaction.investmentEvent.create).not.toHaveBeenCalled();
      expect(transaction.investmentEvent.update).not.toHaveBeenCalled();
      expect(transaction.investmentContributionPlan.update).not.toHaveBeenCalled();
    });
  });
});