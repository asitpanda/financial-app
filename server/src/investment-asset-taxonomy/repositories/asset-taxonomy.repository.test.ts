import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvestmentAssetTaxonomyRecord } from '../investment-asset-taxonomy.types';
import type { IAssetTaxonomyDataSourcePort } from './asset-taxonomy.datasource.port';
import { AssetTaxonomyRepository } from './asset-taxonomy.repository';

describe('AssetTaxonomyRepository', () => {
  let repository: AssetTaxonomyRepository;
  let dataSource: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateLevelsForDescendants: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dataSource = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      updateLevelsForDescendants: vi.fn(),
      delete: vi.fn(),
    };
    repository = new AssetTaxonomyRepository(dataSource as unknown as IAssetTaxonomyDataSourcePort);
  });

  describe('create', () => {
    it('forwards the write input and returns the created node', async () => {
      const input = { userId: 12, label: 'Equities', nodeType: 'CATEGORY', level: 1 };
      const created = { id: 7 } as InvestmentAssetTaxonomyRecord;
      dataSource.create.mockResolvedValue(created);

      await expect(repository.create(input)).resolves.toBe(created);
      expect(dataSource.create).toHaveBeenCalledExactlyOnceWith(input);
    });

    it('propagates data-source failures', async () => {
      const error = new Error('Persistence unavailable');
      dataSource.create.mockRejectedValue(error);

      await expect(repository.create({
        userId: 12,
        label: 'Equities',
        nodeType: 'CATEGORY',
        level: 1,
      })).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('forwards the owner ID and returns the matching nodes', async () => {
      const records = [{ id: 7 }, { id: 8 }] as InvestmentAssetTaxonomyRecord[];
      dataSource.findAll.mockResolvedValue(records);

      await expect(repository.findAll(12)).resolves.toBe(records);
      expect(dataSource.findAll).toHaveBeenCalledExactlyOnceWith(12);
    });
  });

  describe('findOne', () => {
    it('forwards node and owner IDs and preserves a missing result', async () => {
      dataSource.findOne.mockResolvedValue(null);

      await expect(repository.findOne(7, 12)).resolves.toBeNull();
      expect(dataSource.findOne).toHaveBeenCalledExactlyOnceWith(7, 12);
    });
  });

  describe('update', () => {
    it('forwards node ID, owner ID, and the partial update', async () => {
      const input = { label: 'Public Equities' };
      const updated = { id: 7, label: input.label } as InvestmentAssetTaxonomyRecord;
      dataSource.update.mockResolvedValue(updated);

      await expect(repository.update(7, 12, input)).resolves.toBe(updated);
      expect(dataSource.update).toHaveBeenCalledExactlyOnceWith(7, 12, input);
    });
  });

  describe('updateLevelsForDescendants', () => {
    it('forwards the owner and all requested descendant level changes', async () => {
      const updates = [{ id: 8, level: 3 }, { id: 9, level: 4 }];
      dataSource.updateLevelsForDescendants.mockResolvedValue(undefined);

      await expect(repository.updateLevelsForDescendants(12, updates)).resolves.toBeUndefined();
      expect(dataSource.updateLevelsForDescendants).toHaveBeenCalledExactlyOnceWith(12, updates);
    });
  });

  describe('delete', () => {
    it('forwards node and owner IDs', async () => {
      dataSource.delete.mockResolvedValue(undefined);

      await expect(repository.delete(7, 12)).resolves.toBeUndefined();
      expect(dataSource.delete).toHaveBeenCalledExactlyOnceWith(7, 12);
    });
  });
});