import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { InvestmentPrismaRepository } from './investment.prisma.repository';

function createRepository() {
  const prisma = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ unresolved_count: 0 }]),
    appMetaConfigRef: { findFirst: vi.fn() },
    investment: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    repository: new InvestmentPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

function investmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    userId: 42,
    accountId: 12,
    assetTaxonomyId: null,
    assetTypeMetaId: 2,
    assetCategoryMetaId: 12,
    name: 'Index fund',
    assetTypeRef: { code: 'EQUITY', accountingTreatment: null },
    assetCategoryRef: { code: 'STOCK', accountingTreatment: null },
    accountingTreatmentOverride: null,
    institutionName: 'Broker',
    referenceNumber: null,
    status: 'active',
    currency: 'USD',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    maturityDate: null,
    totalInvested: 1000,
    currentValue: 1100,
    currentValueSource: 'manual',
    lastValuationAt: null,
    insuranceCover: null,
    contributionMode: 'ONE_TIME',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('InvestmentPrismaRepository', () => {
  let repository: InvestmentPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('create', () => {
    it('resolves classification metadata, normalizes input, and maps accounting treatment', async () => {
      const startDate = '2026-04-01T00:00:00.000Z';
      const data = {
        accountId: '12',
        assetTaxonomyId: '',
        assetType: 'EQUITY',
        assetCategory: 'STOCK',
        name: 'Index fund',
        institutionName: 'Broker',
        status: 'active',
        currency: 'USD',
        totalInvested: 1000,
        currentValue: 1100,
        contributionMode: 'ONE_TIME',
        startDate,
      };
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 12, parentId: 2 });
      prisma.investment.create.mockResolvedValue(
        investmentRow({
          assetCategoryRef: { code: 'STOCK', accountingTreatment: 'PROTECTION_EXPENSE' },
          assetTypeRef: { code: 'EQUITY', accountingTreatment: 'INSURANCE_SAVINGS' },
        }),
      );

      await expect(repository.create(data as never, 42)).resolves.toMatchObject({
        accountingTreatment: 'PROTECTION_EXPENSE',
        assetCategory: 'STOCK',
      });
      expect(prisma.investment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 42,
          accountId: 12,
          assetTaxonomyId: null,
          assetTypeMetaId: 2,
          assetCategoryMetaId: 12,
          startDate: new Date(startDate),
        }),
        include: { assetTypeRef: true, assetCategoryRef: true },
      });
    });

    it('rejects a category that does not belong to the selected type', async () => {
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 12, parentId: 3 });

      await expect(
        repository.create({ assetType: 'EQUITY', assetCategory: 'STOCK' } as never, 42),
      ).rejects.toThrow('Investment asset category does not belong to the selected asset type');
      expect(prisma.investment.create).not.toHaveBeenCalled();
    });
  });

  describe('findPage', () => {
    it('builds an owner-scoped filtered page and maps accounting defaults', async () => {
      prisma.investment.findMany.mockResolvedValue([
        investmentRow({
          assetCategoryRef: { code: 'STOCK', accountingTreatment: null },
          assetTypeRef: { code: 'EQUITY', accountingTreatment: 'INSURANCE_SAVINGS' },
        }),
      ]);
      prisma.investment.count.mockResolvedValue(1);

      const result = await repository.findPage(42, {
        page: 2,
        limit: 10,
        search: '  index  ',
        status: 'active',
        assetType: 'EQUITY',
        accountingTreatment: 'INSURANCE_SAVINGS',
        sortBy: 'assetType',
        sortDirection: 'asc',
      });

      expect(result).toMatchObject({ total: 1, items: [{ accountingTreatment: 'INSURANCE_SAVINGS' }] });
      const [findManyArgs] = prisma.investment.findMany.mock.calls[0];
      expect(findManyArgs).toMatchObject({
        where: {
          userId: 42,
          status: 'active',
          assetTypeRef: { is: { code: 'EQUITY' } },
          OR: expect.arrayContaining([{ name: { contains: 'index', mode: 'insensitive' } }]),
          AND: expect.any(Array),
        },
        orderBy: [{ assetTypeRef: { code: 'asc' } }, { id: 'asc' }],
        skip: 10,
        take: 10,
      });
      expect(prisma.investment.count).toHaveBeenCalledWith({ where: findManyArgs.where });
    });
  });

  describe('findOne', () => {
    it('scopes the lookup to the owner and maps an explicit treatment override', async () => {
      prisma.investment.findFirst.mockResolvedValue(
        investmentRow({ accountingTreatmentOverride: 'INSURANCE_SAVINGS' }),
      );

      await expect(repository.findOne(7, 42)).resolves.toMatchObject({
        id: 7,
        userId: 42,
        accountingTreatment: 'INSURANCE_SAVINGS',
      });
      expect(prisma.investment.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
        include: { assetTypeRef: true, assetCategoryRef: true },
      });
    });
  });

  describe('update', () => {
    it('does not update an investment when the owner-scoped lookup misses', async () => {
      prisma.investment.findFirst.mockResolvedValue(null);

      await expect(repository.update(7, { name: 'Changed' } as never, 42)).resolves.toBeNull();
      expect(prisma.investment.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('does not delete an investment outside the requested owner', async () => {
      prisma.investment.findFirst.mockResolvedValue(null);

      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(prisma.investment.findFirst).toHaveBeenCalledWith({ where: { id: 7, userId: 42 } });
      expect(prisma.investment.delete).not.toHaveBeenCalled();
    });
  });
});