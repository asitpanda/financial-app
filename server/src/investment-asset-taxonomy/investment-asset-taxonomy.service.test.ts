import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import type { InvestmentAssetTaxonomyRecord } from './investment-asset-taxonomy.types';
import { InvestmentAssetTaxonomyService } from './investment-asset-taxonomy.service';
import { AssetTaxonomyRepository } from './repositories/asset-taxonomy.repository';

function createNode(
  id: number,
  overrides: Partial<InvestmentAssetTaxonomyRecord> = {},
): InvestmentAssetTaxonomyRecord {
  return {
    id,
    userId: 12,
    label: `Node ${id}`,
    nodeType: 'CATEGORY',
    parentId: null,
    level: 1,
    defaultAssetType: null,
    defaultAssetCategory: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    updateLevelsForDescendants: vi.fn(),
    delete: vi.fn(),
  };
  const prisma = {
    appMetaConfigRef: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    service: new InvestmentAssetTaxonomyService(
      repository as unknown as AssetTaxonomyRepository,
      prisma as unknown as PrismaService,
    ),
    repository,
    prisma,
  };
}

describe('InvestmentAssetTaxonomyService', () => {
  let service: InvestmentAssetTaxonomyService;
  let repository: ReturnType<typeof createService>['repository'];
  let prisma: ReturnType<typeof createService>['prisma'];

  beforeEach(() => {
    ({ service, repository, prisma } = createService());
    repository.findAll.mockResolvedValue([]);
    prisma.appMetaConfigRef.findFirst.mockResolvedValue(null);
    prisma.appMetaConfigRef.findMany.mockResolvedValue([]);
  });

  describe('create', () => {
    it('creates a top-level node for the requested user', async () => {
      const input = { label: 'Equities', nodeType: 'CATEGORY', level: 1 };
      const created = createNode(31, { ...input, userId: 12 });
      repository.create.mockResolvedValue(created);

      await expect(service.create(input, 12)).resolves.toBe(created);
      expect(repository.create).toHaveBeenCalledWith({ ...input, userId: 12 });
    });

    it('requires a parent for nested nodes', async () => {
      await expect(
        service.create({ label: 'Large Cap', nodeType: 'CATEGORY', level: 2 }, 12),
      ).rejects.toMatchObject({
        response: { field: 'parentId', message: 'Parent is required for nested nodes' },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a parent on a top-level node', async () => {
      await expect(
        service.create(
          { label: 'Equities', nodeType: 'CATEGORY', level: 1, parentId: 2 },
          12,
        ),
      ).rejects.toMatchObject({
        response: { field: 'parentId', message: 'Top-level taxonomy nodes cannot have a parent' },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('requires the parent to exist for the user', async () => {
      await expect(
        service.create(
          { label: 'Large Cap', nodeType: 'CATEGORY', level: 2, parentId: 99 },
          12,
        ),
      ).rejects.toMatchObject({
        response: { field: 'parentId', message: 'Parent taxonomy node not found for user' },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('requires the parent to be at the previous hierarchy level', async () => {
      repository.findAll.mockResolvedValue([createNode(4, { level: 1 })]);

      await expect(
        service.create(
          { label: 'Large Cap', nodeType: 'CATEGORY', level: 3, parentId: 4 },
          12,
        ),
      ).rejects.toMatchObject({
        response: { field: 'parentId', message: 'Parent must come from the previous level' },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate labels among siblings without regard to case or surrounding whitespace', async () => {
      repository.findAll.mockResolvedValue([
        createNode(4, { label: '  Equities  ', parentId: null }),
      ]);

      await expect(
        service.create({ label: 'equities', nodeType: 'CATEGORY', level: 1 }, 12),
      ).rejects.toMatchObject({
        response: { field: 'label', message: 'Label already exists under the selected parent' },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('requires an asset type when a default asset category is set', async () => {
      await expect(
        service.create(
          {
            label: 'Equities',
            nodeType: 'CATEGORY',
            level: 1,
            defaultAssetCategory: 'COMMON_STOCK',
          },
          12,
        ),
      ).rejects.toMatchObject({
        response: {
          field: 'defaultAssetType',
          message: 'Default asset type is required when a default asset category is set',
        },
      });
      expect(prisma.appMetaConfigRef.findFirst).not.toHaveBeenCalled();
    });

    it('rejects an unsupported default asset type', async () => {
      await expect(
        service.create(
          {
            label: 'Equities',
            nodeType: 'CATEGORY',
            level: 1,
            defaultAssetType: 'UNKNOWN',
          },
          12,
        ),
      ).rejects.toMatchObject({
        response: { field: 'defaultAssetType', message: 'Unsupported default asset type' },
      });
      expect(prisma.appMetaConfigRef.findFirst).toHaveBeenCalledWith({
        where: {
          module: 'INVESTMENT',
          configType: 'ASSET_TYPE',
          code: 'UNKNOWN',
          isActive: true,
        },
      });
    });

    it('rejects a category that does not belong to the selected asset type', async () => {
      prisma.appMetaConfigRef.findFirst.mockResolvedValue({
        id: 8,
        code: 'STOCK',
        label: 'Stock',
      });
      prisma.appMetaConfigRef.findMany.mockResolvedValue([
        { code: 'COMMON_STOCK', label: 'Common Stock' },
      ]);

      await expect(
        service.create(
          {
            label: 'Bonds',
            nodeType: 'CATEGORY',
            level: 1,
            defaultAssetType: 'STOCK',
            defaultAssetCategory: 'GOVERNMENT_BOND',
          },
          12,
        ),
      ).rejects.toMatchObject({
        response: {
          field: 'defaultAssetCategory',
          message: 'Default asset category is not valid for the selected default asset type',
        },
      });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('normalizes classification codes when validating a valid default category', async () => {
      prisma.appMetaConfigRef.findFirst.mockResolvedValue({
        id: 8,
        code: 'STOCK',
        label: 'Stock',
      });
      prisma.appMetaConfigRef.findMany.mockResolvedValue([
        { code: 'COMMON_STOCK', label: 'Common Stock' },
      ]);
      const input = {
        label: 'Equities',
        nodeType: 'CATEGORY',
        level: 1,
        defaultAssetType: ' stock ',
        defaultAssetCategory: ' common_stock ',
      };
      const created = createNode(31, { ...input, userId: 12 });
      repository.create.mockResolvedValue(created);

      await expect(service.create(input, 12)).resolves.toBe(created);
      expect(prisma.appMetaConfigRef.findFirst).toHaveBeenCalledWith({
        where: {
          module: 'INVESTMENT',
          configType: 'ASSET_TYPE',
          code: 'STOCK',
          isActive: true,
        },
      });
      expect(prisma.appMetaConfigRef.findMany).toHaveBeenCalledWith({
        where: {
          module: 'INVESTMENT',
          configType: 'ASSET_CATEGORY',
          parentId: 8,
          isActive: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      });
      expect(repository.create).toHaveBeenCalledWith({ ...input, userId: 12 });
    });
  });

  describe('findAll', () => {
    it('returns taxonomy nodes scoped to the requested user', async () => {
      const nodes = [createNode(4)];
      repository.findAll.mockResolvedValue(nodes);

      await expect(service.findAll(12)).resolves.toBe(nodes);
      expect(repository.findAll).toHaveBeenCalledWith(12);
    });
  });

  describe('findOne', () => {
    it('returns null when the requested node does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(404, 12)).resolves.toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith(404, 12);
    });
  });

  describe('update', () => {
    it('returns null without attempting an update when the node is missing', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(404, { label: 'Renamed' }, 12)).resolves.toBeNull();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows the current node to retain its normalized label', async () => {
      const existing = createNode(4, { label: 'Equities' });
      repository.findOne.mockResolvedValue(existing);
      repository.findAll.mockResolvedValue([existing]);
      repository.update.mockResolvedValue({ ...existing, label: ' equities ' });

      await expect(
        service.update(4, { label: ' equities ' }, 12),
      ).resolves.toMatchObject({ id: 4, label: ' equities ' });
      expect(repository.update).toHaveBeenCalledWith(4, 12, { label: ' equities ' });
      expect(repository.updateLevelsForDescendants).not.toHaveBeenCalled();
    });

    it('shifts every descendant level when a node is moved deeper', async () => {
      const existing = createNode(2, { label: 'Growth', parentId: 1, level: 2 });
      const nodes = [
        createNode(1, { level: 1 }),
        existing,
        createNode(3, { label: 'Value', parentId: 1, level: 2 }),
        createNode(4, { parentId: 2, level: 3 }),
        createNode(5, { parentId: 4, level: 4 }),
      ];
      repository.findOne.mockResolvedValue(existing);
      repository.findAll.mockResolvedValue(nodes);
      repository.update.mockResolvedValue({ ...existing, parentId: 3, level: 3 });

      await expect(
        service.update(2, { parentId: 3, level: 3 }, 12),
      ).resolves.toMatchObject({ id: 2, parentId: 3, level: 3 });

      expect(repository.update).toHaveBeenCalledWith(2, 12, { parentId: 3, level: 3 });
      expect(repository.updateLevelsForDescendants).toHaveBeenCalledWith(12, [
        { id: 4, level: 4 },
        { id: 5, level: 5 },
      ]);
    });

    it('rejects a move that would push a descendant beyond level five', async () => {
      const existing = createNode(2, { parentId: 1, level: 2 });
      repository.findOne.mockResolvedValue(existing);
      repository.findAll.mockResolvedValue([
        createNode(1, { level: 1 }),
        existing,
        createNode(3, { label: 'Sibling parent', parentId: 1, level: 2 }),
        createNode(4, { parentId: 2, level: 5 }),
      ]);

      await expect(
        service.update(2, { parentId: 3, level: 3 }, 12),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.updateLevelsForDescendants).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the requested node for its user', async () => {
      repository.delete.mockResolvedValue(undefined);

      await expect(service.remove(4, 12)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(4, 12);
    });
  });
});
