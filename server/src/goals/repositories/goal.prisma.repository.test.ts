import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { GoalPrismaRepository } from './goal.prisma.repository';

function createRepository() {
  const prisma = {
    goal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    repository: new GoalPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

const goalRow = (overrides = {}) => ({
  id: 7,
  userId: 42,
  name: 'Emergency fund',
  categoryId: 2,
  categoryLabelSnapshot: 'Savings',
  description: null,
  icon: null,
  targetAmount: 5000,
  currentAmount: 0,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  deadline: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('GoalPrismaRepository', () => {
  let repository: GoalPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('create', () => {
    it('stores optional goal fields as null and parses a supplied deadline', async () => {
      const data = {
        name: 'Emergency fund',
        categoryId: 2,
        categoryLabelSnapshot: 'Savings',
        targetAmount: 5000,
        deadline: '2027-06-30T00:00:00.000Z',
      };
      prisma.goal.create.mockResolvedValue(goalRow({ deadline: new Date(data.deadline) }));

      await expect(repository.create(data as never, 42)).resolves.toMatchObject({
        userId: 42,
        currentAmount: 0,
        description: null,
        icon: null,
        deadline: new Date(data.deadline),
      });
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...data,
          currentAmount: 0,
          description: null,
          icon: null,
          deadline: new Date(data.deadline),
          userId: 42,
        }),
      });
    });
  });

  describe('findAll', () => {
    it("returns only the requested owner's goals ordered newest first", async () => {
      prisma.goal.findMany.mockResolvedValue([goalRow()]);

      await expect(repository.findAll(42)).resolves.toEqual([goalRow()]);
      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('looks up the goal within its owner and returns null when absent', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(repository.findOne(7, 42)).resolves.toBeNull();
      expect(prisma.goal.findFirst).toHaveBeenCalledWith({
        where: { id: 7, userId: 42 },
      });
    });
  });

  describe('update', () => {
    it('updates a goal only after confirming ownership and parses its deadline', async () => {
      const deadline = '2027-06-30T00:00:00.000Z';
      prisma.goal.findFirst.mockResolvedValue(goalRow());
      prisma.goal.update.mockResolvedValue(goalRow({ deadline: new Date(deadline) }));

      await expect(repository.update(7, { deadline } as never, 42)).resolves.toMatchObject({
        deadline: new Date(deadline),
      });
      expect(prisma.goal.findFirst).toHaveBeenCalledWith({ where: { id: 7, userId: 42 } });
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: expect.objectContaining({ deadline: new Date(deadline) }),
      });
    });

    it('returns null without updating a goal that is not owned by the requester', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(repository.update(7, {}, 42)).resolves.toBeNull();
      expect(prisma.goal.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes only after confirming ownership', async () => {
      prisma.goal.findFirst.mockResolvedValue(goalRow());
      prisma.goal.delete.mockResolvedValue(goalRow());

      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(prisma.goal.findFirst).toHaveBeenCalledWith({ where: { id: 7, userId: 42 } });
      expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    });

    it('does nothing when the goal is not owned by the requester', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(repository.delete(7, 42)).resolves.toBeUndefined();
      expect(prisma.goal.delete).not.toHaveBeenCalled();
    });
  });
});