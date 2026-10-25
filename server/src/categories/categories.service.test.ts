import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './repositories/category.repository';

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    service: new CategoriesService(repository as unknown as CategoryRepository),
    repository,
  };
}

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: ReturnType<typeof createService>['repository'];

  beforeEach(() => {
    ({ service, repository } = createService());
  });

  describe('create', () => {
    it('creates a category for the requested user', async () => {
      const categoryData = { name: 'Food', type: 'expense' };
      const category = { id: 4, userId: 12, ...categoryData };
      repository.create.mockResolvedValue(category);

      await expect(service.create(categoryData, 12)).resolves.toBe(category);
      expect(repository.create).toHaveBeenCalledWith(categoryData, 12);
    });

    it('propagates repository failures', async () => {
      const error = new Error('Repository unavailable');
      repository.create.mockRejectedValue(error);

      await expect(
        service.create({ name: 'Food', type: 'expense' }, 12),
      ).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    it('returns the requested user categories, including an empty result', async () => {
      const categories: never[] = [];
      repository.findAll.mockResolvedValue(categories);

      await expect(service.findAll(12)).resolves.toBe(categories);
      expect(repository.findAll).toHaveBeenCalledWith(12);
    });
  });

  describe('findOne', () => {
    it('returns null when the requested category is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(404, 12)).resolves.toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith(404, 12);
    });
  });

  describe('update', () => {
    it('forwards the category ID, changes, and user ID', async () => {
      const changes = { name: 'Groceries' };
      const category = { id: 4, userId: 12, name: 'Groceries' };
      repository.update.mockResolvedValue(category);

      await expect(service.update(4, changes, 12)).resolves.toBe(category);
      expect(repository.update).toHaveBeenCalledWith(4, changes, 12);
    });
  });

  describe('remove', () => {
    it('deletes the requested category for its user', async () => {
      repository.delete.mockResolvedValue(undefined);

      await expect(service.remove(4, 12)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(4, 12);
    });
  });
});
