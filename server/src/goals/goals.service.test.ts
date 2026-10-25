import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalRepository } from './repositories/goal.repository';
import { GoalsService } from './goals.service';

function createService() {
  const goalRepository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    service: new GoalsService(goalRepository as unknown as GoalRepository),
    goalRepository,
  };
}

describe('GoalsService', () => {
  let service: GoalsService;
  let goalRepository: ReturnType<typeof createService>['goalRepository'];

  beforeEach(() => {
    ({ service, goalRepository } = createService());
  });

  describe('create', () => {
    it('creates a goal for the requesting user and returns the repository result', async () => {
      const input = {
        name: 'Emergency fund',
        categoryId: 2,
        categoryLabelSnapshot: 'Savings',
        targetAmount: 5000,
      } as CreateGoalDto;
      const createdGoal = { id: 7, name: 'Emergency fund' };
      goalRepository.create.mockResolvedValue(createdGoal);

      await expect(service.create(input, 42)).resolves.toBe(createdGoal);
      expect(goalRepository.create).toHaveBeenCalledWith(input, 42);
    });
  });

  describe('findAll', () => {
    it('returns an empty list when the user has no goals', async () => {
      goalRepository.findAll.mockResolvedValue([]);

      await expect(service.findAll(42)).resolves.toEqual([]);
      expect(goalRepository.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findOne', () => {
    it('returns null when the requested goal is not found for the user', async () => {
      goalRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(7, 42)).resolves.toBeNull();
      expect(goalRepository.findOne).toHaveBeenCalledWith(7, 42);
    });
  });

  describe('update', () => {
    it('updates a goal for the requesting user and returns the repository result', async () => {
      const input = { name: 'House deposit' } as UpdateGoalDto;
      const updatedGoal = { id: 7, name: 'House deposit' };
      goalRepository.update.mockResolvedValue(updatedGoal);

      await expect(service.update(7, input, 42)).resolves.toBe(updatedGoal);
      expect(goalRepository.update).toHaveBeenCalledWith(7, input, 42);
    });
  });

  describe('remove', () => {
    it('deletes the requested goal for the requesting user', async () => {
      goalRepository.delete.mockResolvedValue(undefined);

      await expect(service.remove(7, 42)).resolves.toBeUndefined();
      expect(goalRepository.delete).toHaveBeenCalledWith(7, 42);
    });
  });
});