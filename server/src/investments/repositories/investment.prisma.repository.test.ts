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

    it.each([
      [null, { id: 12, parentId: 2 }],
      [{ id: 2 }, null],
    ])('rejects when either classification metadata row is missing', async (assetTypeMeta, assetCategoryMeta) => {
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce(assetTypeMeta)
        .mockResolvedValueOnce(assetCategoryMeta);

      await expect(
        repository.create({ assetType: 'EQUITY', assetCategory: 'STOCK' } as never, 42),
      ).rejects.toThrow('Investment asset classification metadata not found');
      expect(prisma.investment.create).not.toHaveBeenCalled();
    });

    it('uses the supplied transaction client for persistence', async () => {
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 12, parentId: 2 });
      const transaction = {
        investment: { create: vi.fn().mockResolvedValue(investmentRow()) },
      };

      await repository.create({
        accountId: 12,
        assetType: 'EQUITY',
        assetCategory: 'STOCK',
        name: 'Index fund',
        institutionName: 'Broker',
        status: 'active',
        currency: 'USD',
        totalInvested: 1000,
        contributionMode: 'ONE_TIME',
        startDate: '2026-01-01',
      } as never, 42, transaction as never);

      expect(transaction.investment.create).toHaveBeenCalledOnce();
      expect(prisma.investment.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('repairs null metadata once and maps the returned records', async () => {
      prisma.investment.findMany.mockResolvedValue([investmentRow()]);

      await expect(repository.findAll(42)).resolves.toMatchObject([
        { id: 7, assetType: 'EQUITY', assetCategory: 'STOCK', accountingTreatment: 'INVESTMENT' },
      ]);
      await repository.findAll(42);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledOnce();
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledOnce();
      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: { createdAt: 'desc' },
        include: { assetTypeRef: true, assetCategoryRef: true },
      });
    });

    it('treats an empty unresolved-row query as a successful metadata repair', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      prisma.investment.findMany.mockResolvedValue([]);

      await expect(repository.findAll(42)).resolves.toEqual([]);
      await expect(repository.findAll(42)).resolves.toEqual([]);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledOnce();
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledOnce();
      expect(prisma.investment.findMany).toHaveBeenCalledTimes(2);
    });

    it('fails before listing when metadata repair leaves unresolved records', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ unresolved_count: 2 }]);

      await expect(repository.findAll(42)).rejects.toThrow(
        'Found 2 investments with unresolved asset metadata references after repair',
      );
      expect(prisma.investment.findMany).not.toHaveBeenCalled();
    });

    it('retries metadata repair after a failed unresolved-row check', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ unresolved_count: 1 }]);

      await expect(repository.findAll(42)).rejects.toThrow(
        'Found 1 investments with unresolved asset metadata references after repair',
      );
      await expect(repository.findAll(42)).rejects.toThrow(
        'Found 1 investments with unresolved asset metadata references after repair',
      );

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
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
        ids: [7],
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
          id: { in: [7] },
          status: 'active',
          assetTypeRef: { is: { code: 'EQUITY' } },
          OR: expect.arrayContaining([{ name: { contains: 'index', mode: 'insensitive' } }]),
          AND: expect.any(Array),
        },
        orderBy: [{ assetTypeRef: { code: 'asc' } }, { id: 'asc' }],
        skip: 10,
        take: 10,
      });
      expect(findManyArgs.where.OR).toEqual([
        { name: { contains: 'index', mode: 'insensitive' } },
        { institutionName: { contains: 'index', mode: 'insensitive' } },
        { referenceNumber: { contains: 'index', mode: 'insensitive' } },
        { assetTypeRef: { is: { code: { contains: 'index', mode: 'insensitive' } } } },
        { assetTypeRef: { is: { label: { contains: 'index', mode: 'insensitive' } } } },
      ]);
      expect(prisma.investment.count).toHaveBeenCalledWith({ where: findManyArgs.where });
    });

    it('uses default sorting and adds the INVESTMENT treatment fallback branch', async () => {
      prisma.investment.findMany.mockResolvedValue([]);
      prisma.investment.count.mockResolvedValue(0);

      await repository.findPage(42, { page: 1, limit: 10, accountingTreatment: 'INVESTMENT' });

      const [findManyArgs] = prisma.investment.findMany.mock.calls[0];
      expect(findManyArgs).toMatchObject({
        where: {
          userId: 42,
          AND: [{ OR: expect.arrayContaining([
            { accountingTreatmentOverride: 'INVESTMENT' },
            { AND: [
              { accountingTreatmentOverride: null },
              { assetCategoryRef: { is: { accountingTreatment: 'INVESTMENT' } } },
            ] },
            { AND: [
              { accountingTreatmentOverride: null },
              { assetCategoryRef: { is: { accountingTreatment: null } } },
              { assetTypeRef: { is: { accountingTreatment: 'INVESTMENT' } } },
            ] },
            { AND: [
              { accountingTreatmentOverride: null },
              { assetCategoryRef: { is: { accountingTreatment: null } } },
              { assetTypeRef: { is: { accountingTreatment: null } } },
            ] },
          ]) }],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 10,
      });
    });

    it('sorts by asset category metadata when requested', async () => {
      prisma.investment.findMany.mockResolvedValue([]);
      prisma.investment.count.mockResolvedValue(0);

      await repository.findPage(42, {
        page: 1,
        limit: 10,
        sortBy: 'assetCategory',
        sortDirection: 'asc',
      });

      expect(prisma.investment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: [{ assetCategoryRef: { code: 'asc' } }, { id: 'asc' }],
      }));
    });
  });

  describe('findAllForPortfolio', () => {
    it('excludes closed records and maps the owner-scoped portfolio results', async () => {
      prisma.investment.findMany.mockResolvedValue([investmentRow()]);

      await expect(repository.findAllForPortfolio(42)).resolves.toMatchObject([
        { id: 7, accountingTreatment: 'INVESTMENT' },
      ]);
      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: { userId: 42, NOT: { status: { equals: 'closed', mode: 'insensitive' } } },
        orderBy: { createdAt: 'desc' },
        include: { assetTypeRef: true, assetCategoryRef: true },
      });
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

    it('returns null when the owner-scoped record is absent', async () => {
      prisma.investment.findFirst.mockResolvedValue(null);

      await expect(repository.findOne(7, 99)).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('looks up by ID without an owner filter and returns null when missing', async () => {
      prisma.investment.findUnique.mockResolvedValueOnce(investmentRow()).mockResolvedValueOnce(null);

      await expect(repository.findById(7)).resolves.toMatchObject({ id: 7, userId: 42 });
      await expect(repository.findById(8)).resolves.toBeNull();
      expect(prisma.investment.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: 7 },
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

    it('updates supplied fields and preserves the existing classification IDs', async () => {
      prisma.investment.findFirst.mockResolvedValue(investmentRow());
      prisma.investment.update.mockResolvedValue(investmentRow({ name: 'Updated fund' }));

      await expect(repository.update(7, { name: 'Updated fund' } as never, 42)).resolves.toMatchObject({
        id: 7,
        name: 'Updated fund',
      });
      expect(prisma.investment.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({ name: 'Updated fund' }),
        include: { assetTypeRef: true, assetCategoryRef: true },
      }));
      const [updateArgs] = prisma.investment.update.mock.calls[0];
      expect(updateArgs.data).not.toHaveProperty('assetTypeMetaId');
      expect(updateArgs.data).not.toHaveProperty('assetCategoryMetaId');
    });

    it('uses the supplied transaction client for ownership lookup and persistence', async () => {
      const transaction = {
        investment: {
          findFirst: vi.fn().mockResolvedValue(investmentRow()),
          update: vi.fn().mockResolvedValue(investmentRow({ name: 'Updated in transaction' })),
        },
      };

      await expect(
        repository.update(7, { name: 'Updated in transaction' } as never, 42, transaction as never),
      ).resolves.toMatchObject({ name: 'Updated in transaction' });
      expect(transaction.investment.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
        include: { assetTypeRef: true, assetCategoryRef: true },
      });
      expect(transaction.investment.update).toHaveBeenCalledOnce();
      expect(prisma.investment.findFirst).not.toHaveBeenCalled();
      expect(prisma.investment.update).not.toHaveBeenCalled();
    });

    it('resolves new metadata when the asset category changes', async () => {
      prisma.investment.findFirst.mockResolvedValue(investmentRow());
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 16, parentId: 2 })
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 16, parentId: 2 });
      prisma.investment.update.mockResolvedValue(investmentRow({
        assetCategoryMetaId: 16,
        assetCategoryRef: { code: 'BOND', accountingTreatment: null },
      }));

      await repository.update(7, { assetCategory: 'BOND' } as never, 42);

      expect(prisma.investment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ assetTypeMetaId: 2, assetCategoryMetaId: 16 }),
      }));
      expect(prisma.appMetaConfigRef.findFirst).toHaveBeenCalledTimes(4);
    });

    it('rejects an invalid new classification without updating the record', async () => {
      prisma.investment.findFirst.mockResolvedValue(investmentRow());
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce({ id: 3 })
        .mockResolvedValueOnce({ id: 16, parentId: 2 });

      await expect(repository.update(7, { assetCategory: 'BOND' } as never, 42)).rejects.toThrow(
        'Investment asset category does not belong to the selected asset type',
      );
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

    it('deletes an existing record after confirming ownership', async () => {
      prisma.investment.findFirst.mockResolvedValue(investmentRow());
      prisma.investment.delete.mockResolvedValue(investmentRow());

      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(prisma.investment.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });
});