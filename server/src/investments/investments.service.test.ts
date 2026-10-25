import { BadRequestException } from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetTaxonomyRepository } from '../investment-asset-taxonomy/repositories/asset-taxonomy.repository';
import { PrismaService } from '../database/prisma.service';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { ValuationSnapshotsService } from '../valuation-snapshots/valuation-snapshots.service';
import { AnalyticsEngineService } from './analytics/analytics-engine.service';
import { InvestmentRepository } from './repositories/investment.repository';
import { InvestmentsService } from './investments.service';

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findAllForPortfolio: vi.fn(),
    findPage: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const assetTaxonomyRepository = { findOne: vi.fn() };
  const contributionPlansService = {
    confirmRecurringPlan: vi.fn(),
    findAllByInvestmentIds: vi.fn().mockResolvedValue([]),
    findAllByUser: vi.fn().mockResolvedValue([]),
    findAllByInvestment: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  };
  const investmentEventsService = {
    create: vi.fn(),
    findAllByInvestment: vi.fn().mockResolvedValue([]),
  };
  const valuationSnapshotsService = { findAllByInvestment: vi.fn().mockResolvedValue([]) };
  const analyticsEngine = { deriveEventValuation: vi.fn().mockReturnValue(null) };
  const investment = {
    findUnique: vi.fn().mockResolvedValue({ currentValue: 125 }),
    update: vi.fn(),
  };
  const transaction = {
    investment,
    investmentContributionPlan: { findFirst: vi.fn() },
    valuationSnapshot: { create: vi.fn() },
    financialAccount: { findFirst: vi.fn() },
  };
  const prisma = {
    appMetaConfigRef: {
      findFirst: vi.fn().mockResolvedValue({ id: 5, code: 'EQUITY', label: 'Equity' }),
      findMany: vi.fn().mockResolvedValue([{ id: 6, parentId: 5, code: 'STOCK', label: 'Stock' }]),
    },
    financialAccount: { findFirst: vi.fn().mockResolvedValue({ id: 9, currency: 'USD' }) },
    $transaction: vi.fn(async (callback: (value: unknown) => Promise<unknown>) => callback(transaction)),
  };

  return {
    service: new InvestmentsService(
      repository as unknown as InvestmentRepository,
      assetTaxonomyRepository as unknown as AssetTaxonomyRepository,
      contributionPlansService as unknown as InvestmentContributionPlansService,
      investmentEventsService as unknown as InvestmentEventsService,
      valuationSnapshotsService as unknown as ValuationSnapshotsService,
      prisma as unknown as PrismaService,
      analyticsEngine as unknown as AnalyticsEngineService,
    ),
    repository,
    assetTaxonomyRepository,
    contributionPlansService,
    investmentEventsService,
    valuationSnapshotsService,
    prisma,
    transaction,
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Index fund',
    assetType: 'EQUITY',
    assetCategory: 'STOCK',
    accountId: 9,
    institutionName: 'Broker',
    status: 'active',
    currency: 'USD',
    startDate: '2026-01-01T00:00:00.000Z',
    totalInvested: 100,
    currentValue: 125,
    contributionMode: 'ONE_TIME',
    ...overrides,
  };
}

describe('InvestmentsService', () => {
  let service: InvestmentsService;
  let repository: ReturnType<typeof createService>['repository'];
  let assetTaxonomyRepository: ReturnType<typeof createService>['assetTaxonomyRepository'];
  let contributionPlansService: ReturnType<typeof createService>['contributionPlansService'];
  let investmentEventsService: ReturnType<typeof createService>['investmentEventsService'];
  let valuationSnapshotsService: ReturnType<typeof createService>['valuationSnapshotsService'];
  let prisma: ReturnType<typeof createService>['prisma'];
  let transaction: ReturnType<typeof createService>['transaction'];

  beforeEach(() => {
    ({
      service,
      repository,
      assetTaxonomyRepository,
      contributionPlansService,
      investmentEventsService,
      valuationSnapshotsService,
      prisma,
      transaction,
    } = createService());
  });

  describe('create', () => {
    it('seeds opening activity and a valuation snapshot for a one-time investment', async () => {
      const input = createInput({ lastValuationAt: '2026-02-01T00:00:00.000Z' });
      const created = { id: 12, accountingTreatment: 'INVESTMENT' };
      repository.create.mockResolvedValue(created);
      transaction.investment.findUnique.mockResolvedValue({ currentValue: 125 });

      await expect(service.create(input as never, 42)).resolves.toMatchObject({
        id: 12,
        accountingTreatment: 'INVESTMENT',
        currentValue: 125,
      });

      expect(assetTaxonomyRepository.findOne).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(input, 42, transaction);
      expect(investmentEventsService.create).toHaveBeenCalledWith(
        {
          investmentId: '12',
          eventType: InvestmentEventType.OPENING_BALANCE,
          status: 'CONFIRMED',
          eventSource: 'MANUAL',
          eventDate: input.startDate,
          amount: 100,
          netAmount: 100,
        },
        undefined,
        transaction,
      );
      expect(transaction.valuationSnapshot.create).toHaveBeenCalledWith({
        data: {
          userId: 42,
          investmentId: 12,
          snapshotDate: new Date('2026-02-01T00:00:00.000Z'),
          marketValue: 125,
          source: 'manual',
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('rejects an investment when its linked account is not owned by the user', async () => {
      prisma.financialAccount.findFirst.mockResolvedValue(null);

      await expect(service.create(createInput() as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an investment when its taxonomy bucket is not owned by the user', async () => {
      assetTaxonomyRepository.findOne.mockResolvedValue(null);
      const input = createInput({ assetTaxonomyId: 27 });

      await expect(service.create(input as never, 42)).rejects.toBeInstanceOf(BadRequestException);

      expect(assetTaxonomyRepository.findOne).toHaveBeenCalledWith(27, 42);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('delegates recurring-plan setup without seeding one-time opening activity', async () => {
      const recurringPlan = { amount: 100, cadenceUnit: 'month' };
      const input = createInput({ contributionMode: 'RECURRING', recurringPlan });
      repository.create.mockResolvedValue({ id: 13, accountingTreatment: 'INVESTMENT' });

      await service.create(input as never, 42);

      expect(investmentEventsService.create).not.toHaveBeenCalled();
      expect(transaction.valuationSnapshot.create).not.toHaveBeenCalled();
      expect(contributionPlansService.confirmRecurringPlan).toHaveBeenCalledWith(
        '13',
        recurringPlan,
        42,
        transaction,
      );
    });
  });

  describe('getMetadata', () => {
    it('returns active asset types with their categories', async () => {
      prisma.appMetaConfigRef.findMany
        .mockResolvedValueOnce([{ id: 5, code: 'EQUITY', label: 'Equity' }])
        .mockResolvedValueOnce([{ id: 6, parentId: 5, code: 'STOCK', label: 'Stock' }]);

      await expect(service.getMetadata()).resolves.toEqual({
        asset_configs: [{
          id: 5,
          code: 'EQUITY',
          label: 'Equity',
          accountingTreatment: null,
          categories: [{ id: 6, code: 'STOCK', label: 'Stock', accountingTreatment: null }],
        }],
      });

      expect(prisma.appMetaConfigRef.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('returns an empty collection when the user has no investments', async () => {
      repository.findAll.mockResolvedValue([]);

      await expect(service.findAll(42)).resolves.toEqual([]);

      expect(repository.findAll).toHaveBeenCalledWith(42);
      expect(contributionPlansService.findAllByUser).toHaveBeenCalledWith(42);
    });
  });

  describe('findPage', () => {
    it('returns an empty page with pagination metadata', async () => {
      const query = { page: 2, limit: 10 };
      repository.findPage.mockResolvedValue({ items: [], total: 0 });

      await expect(service.findPage(42, query as never)).resolves.toEqual({
        data: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0, hasNextPage: false },
      });

      expect(repository.findPage).toHaveBeenCalledWith(42, query);
      expect(contributionPlansService.findAllByInvestmentIds).toHaveBeenCalledWith([]);
    });
  });

  describe('getDashboardAnalytics', () => {
    it('rejects aggregating investments held in different currencies', async () => {
      repository.findAllForPortfolio.mockResolvedValue([
        { id: 12, name: 'Fund', status: 'active', currency: 'USD', currentValue: 100 },
        { id: 13, name: 'Bond', status: 'active', currency: 'EUR', currentValue: 100 },
      ]);

      await expect(service.getDashboardAnalytics(42)).rejects.toThrow(
        'Portfolio analytics cannot aggregate different currencies without an exchange-rate policy. Holdings remain available separately.',
      );

      expect(repository.findAllForPortfolio).toHaveBeenCalledTimes(2);
      expect(investmentEventsService.findAllByInvestment).not.toHaveBeenCalled();
    });
  });

  describe('findDetailShell', () => {
    it('returns null without loading related data for an investment the user cannot access', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findDetailShell(12, 42)).resolves.toBeNull();

      expect(repository.findOne).toHaveBeenCalledWith(12, 42);
      expect(contributionPlansService.findAllByInvestment).not.toHaveBeenCalled();
      expect(investmentEventsService.findAllByInvestment).not.toHaveBeenCalled();
    });
  });

  describe('getPerformance', () => {
    it('returns null without loading history for an investment the user cannot access', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getPerformance(12, 42)).resolves.toBeNull();

      expect(repository.findOne).toHaveBeenCalledWith(12, 42);
      expect(investmentEventsService.findAllByInvestment).not.toHaveBeenCalled();
      expect(valuationSnapshotsService.findAllByInvestment).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the detail shell for the requested investment', async () => {
      const detail = { id: 12 } as never;
      const findDetailShell = vi.spyOn(service, 'findDetailShell').mockResolvedValue(detail);

      await expect(service.findOne(12, 42)).resolves.toBe(detail);

      expect(findDetailShell).toHaveBeenCalledWith(12, 42);
    });
  });

  describe('update', () => {
    it('returns null when the user does not own the investment', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(12, { name: 'Updated fund' } as never, 42)).resolves.toBeNull();

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects closing an investment outside the benefit realization flow', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });

      await expect(service.update(12, { status: 'closed' } as never, 42)).rejects.toThrow(
        'Investments must be closed through benefit realization so settlement and cash movement are recorded.',
      );

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects direct changes to invested principal or valuation fields', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });

      await expect(service.update(12, { currentValue: 200 } as never, 42)).rejects.toThrow(
        'Change principal through investment activity and valuation through snapshots. Investment currency cannot be changed.',
      );

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('pauses active recurring plans when an investment matures', async () => {
      repository.findOne.mockResolvedValue({ ...createInput(), id: 12, status: 'active' });
      repository.update.mockResolvedValue({ id: 12, status: 'matured' });
      contributionPlansService.findAllByInvestment.mockResolvedValue([
        { id: 31, status: 'active' },
        { id: 32, status: 'paused' },
      ]);

      await expect(service.update(12, { status: 'matured' } as never, 42)).resolves.toEqual({
        id: 12,
        status: 'matured',
      });

      expect(contributionPlansService.update).toHaveBeenCalledTimes(1);
      expect(contributionPlansService.update).toHaveBeenCalledWith(
        '31',
        { status: 'paused' },
        42,
        transaction,
      );
    });
  });

  describe('remove', () => {
    it('returns null without deleting an investment the user does not own', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(12, 42)).resolves.toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith(12, 42);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting a closed investment', async () => {
      repository.findOne.mockResolvedValue({ id: 12, status: ' Closed ' });

      await expect(service.remove(12, 42)).rejects.toThrow('Closed investments cannot be modified.');
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an owned investment that is still open', async () => {
      repository.findOne.mockResolvedValue({ id: 12, status: 'active' });

      await expect(service.remove(12, 42)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(12, 42);
    });
  });
});