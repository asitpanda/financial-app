import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransactionRepository } from './transaction.repository';
import { TransactionRepository as TransactionRepositoryClass } from './transaction.repository';

function createRepository() {
  const dataSource = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByDateRange: vi.fn(),
    findByType: vi.fn(),
  };

  return {
    repository: new TransactionRepositoryClass(dataSource as never),
    dataSource,
  };
}

describe('TransactionRepository', () => {
  let repository: TransactionRepository;
  let dataSource: ReturnType<typeof createRepository>['dataSource'];

  beforeEach(() => {
    ({ repository, dataSource } = createRepository());
  });

  describe('findAll', () => {
    it('forwards the user ID to the data source', async () => {
      const result = [{ id: 3 }];
      dataSource.findAll.mockResolvedValue(result);

      await expect(repository.findAll(42)).resolves.toBe(result);
      expect(dataSource.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findOne', () => {
    it('forwards the transaction and owner IDs', async () => {
      const result = { id: 3 };
      dataSource.findOne.mockResolvedValue(result);

      await expect(repository.findOne(3, 42)).resolves.toBe(result);
      expect(dataSource.findOne).toHaveBeenCalledWith(3, 42);
    });
  });

  describe('create', () => {
    it('forwards transaction data, owner, and an optional Prisma transaction', async () => {
      const data = { type: 'EXPENSE', amount: 25 };
      const transaction = {};
      const result = { id: 3 };
      dataSource.create.mockResolvedValue(result);

      await expect(repository.create(data as never, 42, transaction as never)).resolves.toBe(result);
      expect(dataSource.create).toHaveBeenCalledWith(data, 42, transaction);
    });
  });

  describe('update', () => {
    it('forwards the transaction ID, changes, and owner ID', async () => {
      const changes = { notes: 'Updated' };
      const result = { id: 3, notes: 'Updated' };
      dataSource.update.mockResolvedValue(result);

      await expect(repository.update(3, changes, 42)).resolves.toBe(result);
      expect(dataSource.update).toHaveBeenCalledWith(3, changes, 42);
    });
  });

  describe('delete', () => {
    it('forwards the transaction and owner IDs', async () => {
      await repository.delete(3, 42);

      expect(dataSource.delete).toHaveBeenCalledWith(3, 42);
    });
  });

  describe('findByDateRange', () => {
    it('forwards the owner and both inclusive date boundaries', async () => {
      const startDate = new Date('2026-10-01T00:00:00.000Z');
      const endDate = new Date('2026-10-31T00:00:00.000Z');

      await repository.findByDateRange(42, startDate, endDate);

      expect(dataSource.findByDateRange).toHaveBeenCalledWith(42, startDate, endDate);
    });
  });

  describe('findByType', () => {
    it('forwards the owner and transaction type', async () => {
      await repository.findByType(42, 'EXPENSE');

      expect(dataSource.findByType).toHaveBeenCalledWith(42, 'EXPENSE');
    });
  });
});