import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IValuationSnapshotDataSourcePort } from './valuation-snapshot.datasource.port';
import { ValuationSnapshotRepository } from './valuation-snapshot.repository';

describe('ValuationSnapshotRepository', () => {
  let repository: ValuationSnapshotRepository;
  let dataSource: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findAllByInvestment: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dataSource = {
      create: vi.fn(),
      findAll: vi.fn(),
      findAllByInvestment: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    repository = new ValuationSnapshotRepository(dataSource as unknown as IValuationSnapshotDataSourcePort);
  });

  describe('create', () => {
    it('forwards snapshot data and returns the data-source result', async () => {
      const input = { investmentId: '12', snapshotDate: '2026-01-01', marketValue: 150 };
      const snapshot = { id: 7 };
      dataSource.create.mockResolvedValue(snapshot);

      await expect(repository.create(input as never)).resolves.toBe(snapshot);
      expect(dataSource.create).toHaveBeenCalledWith(input);
    });
  });

  describe('findAll', () => {
    it('forwards the user identifier', async () => {
      const snapshots = [{ id: 7 }];
      dataSource.findAll.mockResolvedValue(snapshots);

      await expect(repository.findAll(42)).resolves.toBe(snapshots);
      expect(dataSource.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findAllByInvestment', () => {
    it('forwards the investment identifier', async () => {
      const snapshots = [{ id: 7 }];
      dataSource.findAllByInvestment.mockResolvedValue(snapshots);

      await expect(repository.findAllByInvestment('12')).resolves.toBe(snapshots);
      expect(dataSource.findAllByInvestment).toHaveBeenCalledWith('12');
    });
  });

  describe('findOne', () => {
    it('forwards the snapshot identifier and preserves a missing result', async () => {
      dataSource.findOne.mockResolvedValue(null);

      await expect(repository.findOne('7')).resolves.toBeNull();
      expect(dataSource.findOne).toHaveBeenCalledWith('7');
    });
  });

  describe('update', () => {
    it('forwards the identifier and update data', async () => {
      const input = { marketValue: 200 };
      const snapshot = { id: 7, marketValue: 200 };
      dataSource.update.mockResolvedValue(snapshot);

      await expect(repository.update('7', input as never)).resolves.toBe(snapshot);
      expect(dataSource.update).toHaveBeenCalledWith('7', input);
    });
  });

  describe('delete', () => {
    it('forwards the snapshot identifier', async () => {
      dataSource.delete.mockResolvedValue(undefined);

      await expect(repository.delete('7')).resolves.toBeUndefined();
      expect(dataSource.delete).toHaveBeenCalledWith('7');
    });
  });
});