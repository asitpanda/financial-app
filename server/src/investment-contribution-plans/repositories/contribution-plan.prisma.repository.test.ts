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

  describe('findAllByInvestmentIds', () => {
    it('avoids a database query when no investment IDs are requested', async () => {
      await expect(repository.findAllByInvestmentIds([])).resolves.toEqual([]);
      expect(prisma.investmentContributionPlan.findMany).not.toHaveBeenCalled();
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
  });
});