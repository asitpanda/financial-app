import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { CategoryPrismaRepository } from './category.prisma.repository';

function createRepository() {
  const prisma = {
    category: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    repository: new CategoryPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('CategoryPrismaRepository', () => {
  let repository: CategoryPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('create', () => {
    it('associates the new category with its owner', async () => {
      const data = { name: 'Rent', type: 'expense' };
      prisma.category.create.mockResolvedValue({ id: 7, ...data, userId: 42 });

      await expect(repository.create(data, 42)).resolves.toEqual({
        id: 7,
        ...data,
        userId: 42,
      });
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { ...data, userId: 42 },
      });
    });
  });

  describe('findAll', () => {
    it("returns only the owner's categories ordered by name", async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await expect(repository.findAll(42)).resolves.toEqual([]);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it("looks up the category within its owner's records", async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(repository.findOne(7, 42)).resolves.toBeNull();
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
      });
    });
  });

  describe('update', () => {
    it('updates a category only after confirming it belongs to the owner', async () => {
      const data = { name: 'Updated rent' };
      prisma.category.findFirst.mockResolvedValue({ id: 7, userId: 42 });
      prisma.category.update.mockResolvedValue({ id: 7, userId: 42, ...data });

      await expect(repository.update(7, data, 42)).resolves.toEqual({
        id: 7,
        userId: 42,
        ...data,
      });
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
      });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data,
      });
    });

    it('returns null without updating a category owned by someone else', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(repository.update(7, { name: 'Updated rent' }, 42)).resolves.toBeNull();
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes a category only after confirming it belongs to the owner', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 7, userId: 42 });

      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
      });
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    it('does nothing when the category is not owned by the user', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});