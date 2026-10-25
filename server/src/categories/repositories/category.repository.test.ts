import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategoryRecord } from '../category.types';
import type { ICategoryDataSourcePort } from './category.datasource.port';
import { CategoryRepository } from './category.repository';

function createRepository() {
  const dataSource = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    repository: new CategoryRepository(
      dataSource as unknown as ICategoryDataSourcePort,
    ),
    dataSource,
  };
}

const category: CategoryRecord = {
  id: 7,
  userId: 42,
  name: 'Housing',
  type: 'expense',
  icon: null,
  color: null,
  isSystem: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let dataSource: ReturnType<typeof createRepository>['dataSource'];

  beforeEach(() => {
    ({ repository, dataSource } = createRepository());
  });

  describe('create', () => {
    it('forwards the category data and owner and returns the created category', async () => {
      const input = { name: 'Housing', type: 'expense' };
      dataSource.create.mockResolvedValue(category);

      await expect(repository.create(input, 42)).resolves.toBe(category);
      expect(dataSource.create).toHaveBeenCalledWith(input, 42);
    });
  });

  describe('findAll', () => {
    it('forwards the owner and returns the matching categories', async () => {
      dataSource.findAll.mockResolvedValue([category]);

      await expect(repository.findAll(42)).resolves.toEqual([category]);
      expect(dataSource.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findOne', () => {
    it('forwards the category and owner identifiers when no record exists', async () => {
      dataSource.findOne.mockResolvedValue(null);

      await expect(repository.findOne(7, 42)).resolves.toBeNull();
      expect(dataSource.findOne).toHaveBeenCalledWith(7, 42);
    });
  });

  describe('update', () => {
    it('forwards the category data and returns the datasource result', async () => {
      const input = { name: 'Updated housing' };
      dataSource.update.mockResolvedValue(category);

      await expect(repository.update(7, input, 42)).resolves.toBe(category);
      expect(dataSource.update).toHaveBeenCalledWith(7, input, 42);
    });
  });

  describe('delete', () => {
    it('forwards the category and owner identifiers', async () => {
      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(dataSource.delete).toHaveBeenCalledWith(7, 42);
    });
  });
});