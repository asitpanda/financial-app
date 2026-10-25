import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../../database/prisma.service';
import { AssetTaxonomyPrismaRepository } from './asset-taxonomy.prisma.repository';

function createPrismaRepository() {
  const prisma = {
    appMetaConfigRef: { findFirst: vi.fn() },
    investmentAssetTaxonomy: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    repository: new AssetTaxonomyPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    userId: 12,
    label: 'Equities',
    nodeType: 'CATEGORY',
    parentId: null,
    level: 1,
    defaultAssetTypeMetaId: null,
    defaultAssetCategoryMetaId: null,
    defaultAssetTypeRef: null,
    defaultAssetCategoryRef: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AssetTaxonomyPrismaRepository', () => {
  let repository: AssetTaxonomyPrismaRepository;
  let prisma: ReturnType<typeof createPrismaRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createPrismaRepository());
    prisma.appMetaConfigRef.findFirst.mockResolvedValue(null);
  });

  describe('create', () => {
    it('resolves classification metadata and normalizes persisted values', async () => {
      const typeMeta = { id: 21, code: 'STOCK' };
      const categoryMeta = { id: 34, code: 'COMMON_STOCK', parentId: 21 };
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce(typeMeta)
        .mockResolvedValueOnce(categoryMeta);
      prisma.investmentAssetTaxonomy.findFirst.mockResolvedValue({ id: 2 });
      prisma.investmentAssetTaxonomy.create.mockResolvedValue(
        createRecord({
          parentId: 2,
          level: 3,
          defaultAssetTypeMetaId: 21,
          defaultAssetCategoryMetaId: 34,
          defaultAssetTypeRef: typeMeta,
          defaultAssetCategoryRef: categoryMeta,
          sortOrder: 6,
        }),
      );

      const created = await repository.create({
        userId: '12' as never,
        label: 'Equities',
        nodeType: 'CATEGORY',
        parentId: '2' as never,
        level: '3' as never,
        defaultAssetType: 'STOCK',
        defaultAssetCategory: 'COMMON_STOCK',
        sortOrder: '6' as never,
        isActive: false,
      });

      expect(prisma.investmentAssetTaxonomy.create).toHaveBeenCalledWith({
        data: {
          userId: 12,
          label: 'Equities',
          nodeType: 'CATEGORY',
          parentId: 2,
          level: 3,
          defaultAssetTypeMetaId: 21,
          defaultAssetCategoryMetaId: 34,
          sortOrder: 6,
          isActive: false,
        },
        include: {
          defaultAssetTypeRef: true,
          defaultAssetCategoryRef: true,
        },
      });
      expect(prisma.investmentAssetTaxonomy.findFirst).toHaveBeenCalledWith({
        where: { id: 2, userId: 12 },
      });
      expect(created).toMatchObject({
        id: 7,
        userId: 12,
        defaultAssetType: 'STOCK',
        defaultAssetCategory: 'COMMON_STOCK',
      });
    });

    it('rejects a category metadata entry that belongs to another asset type', async () => {
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce({ id: 21, code: 'STOCK' })
        .mockResolvedValueOnce({ id: 34, code: 'BOND', parentId: 99 });

      await expect(
        repository.create({
          userId: 12,
          label: 'Equities',
          nodeType: 'CATEGORY',
          level: 1,
          defaultAssetType: 'STOCK',
          defaultAssetCategory: 'BOND',
        }),
      ).rejects.toThrow(
        'Default investment asset category does not belong to the selected asset type',
      );
      expect(prisma.investmentAssetTaxonomy.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('queries only the requested user and maps classification codes', async () => {
      const record = createRecord({
        defaultAssetTypeMetaId: 21,
        defaultAssetCategoryMetaId: 34,
        defaultAssetTypeRef: { code: 'STOCK' },
        defaultAssetCategoryRef: { code: 'COMMON_STOCK' },
      });
      prisma.investmentAssetTaxonomy.findMany.mockResolvedValue([record]);

      await expect(repository.findAll(12)).resolves.toEqual([
        expect.objectContaining({
          id: 7,
          userId: 12,
          defaultAssetTypeMetaId: 21,
          defaultAssetCategoryMetaId: 34,
          defaultAssetType: 'STOCK',
          defaultAssetCategory: 'COMMON_STOCK',
        }),
      ]);
      expect(prisma.investmentAssetTaxonomy.findMany).toHaveBeenCalledWith({
        where: { userId: 12 },
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
        include: {
          defaultAssetTypeRef: true,
          defaultAssetCategoryRef: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('returns null when no node matches both ID and owner', async () => {
      prisma.investmentAssetTaxonomy.findFirst.mockResolvedValue(null);

      await expect(repository.findOne(7, 12)).resolves.toBeNull();
      expect(prisma.investmentAssetTaxonomy.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 12 },
        include: {
          defaultAssetTypeRef: true,
          defaultAssetCategoryRef: true,
        },
      });
    });
  });

  describe('update', () => {
    it('rejects an update when the node is not owned by the requested user', async () => {
      prisma.investmentAssetTaxonomy.findFirst.mockResolvedValue(null);

      await expect(repository.update(7, 12, { label: 'Renamed' })).rejects.toThrow(
        'Taxonomy node not found for user',
      );
      expect(prisma.investmentAssetTaxonomy.update).not.toHaveBeenCalled();
    });

    it('retains existing classification metadata when the update omits classification fields', async () => {
      const currentRecord = createRecord({
        defaultAssetTypeMetaId: 21,
        defaultAssetCategoryMetaId: 34,
        defaultAssetTypeRef: { id: 21, code: 'STOCK' },
        defaultAssetCategoryRef: { id: 34, code: 'COMMON_STOCK', parentId: 21 },
      });
      const updatedRecord = { ...currentRecord, label: 'Public Equities' };
      prisma.investmentAssetTaxonomy.findFirst
        .mockResolvedValueOnce({ id: 7 })
        .mockResolvedValueOnce(currentRecord);
      prisma.appMetaConfigRef.findFirst
        .mockResolvedValueOnce({ id: 21, code: 'STOCK' })
        .mockResolvedValueOnce({ id: 34, code: 'COMMON_STOCK', parentId: 21 });
      prisma.investmentAssetTaxonomy.update.mockResolvedValue(updatedRecord);

      await expect(
        repository.update(7, 12, { label: 'Public Equities' }),
      ).resolves.toMatchObject({
        id: 7,
        label: 'Public Equities',
        defaultAssetType: 'STOCK',
        defaultAssetCategory: 'COMMON_STOCK',
      });
      expect(prisma.investmentAssetTaxonomy.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: {
          label: 'Public Equities',
          nodeType: undefined,
          parentId: undefined,
          level: undefined,
          defaultAssetTypeMetaId: 21,
          defaultAssetCategoryMetaId: 34,
          sortOrder: undefined,
          isActive: undefined,
        },
        include: {
          defaultAssetTypeRef: true,
          defaultAssetCategoryRef: true,
        },
      });
    });
  });

  describe('updateLevelsForDescendants', () => {
    it('does not open a transaction for an empty update set', async () => {
      await repository.updateLevelsForDescendants(12, []);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.investmentAssetTaxonomy.updateMany).not.toHaveBeenCalled();
    });

    it('updates each descendant level in one transaction scoped by user', async () => {
      prisma.investmentAssetTaxonomy.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockResolvedValue(undefined);

      await repository.updateLevelsForDescendants(12, [
        { id: 8, level: 3 },
        { id: 9, level: 4 },
      ]);

      expect(prisma.investmentAssetTaxonomy.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 8, userId: 12 },
        data: { level: 3 },
      });
      expect(prisma.investmentAssetTaxonomy.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 9, userId: 12 },
        data: { level: 4 },
      });
      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.any(Promise),
        expect.any(Promise),
      ]);
    });
  });

  describe('delete', () => {
    it('deletes only after confirming the node belongs to the requested user', async () => {
      prisma.investmentAssetTaxonomy.findFirst.mockResolvedValue({ id: 7 });

      await repository.delete(7, 12);

      expect(prisma.investmentAssetTaxonomy.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 12 },
        select: { id: true },
      });
      expect(prisma.investmentAssetTaxonomy.delete).toHaveBeenCalledWith({
        where: { id: 7 },
      });
    });
  });
});
