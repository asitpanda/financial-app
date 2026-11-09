import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateGoalDto } from './create-goal.dto';

const requiredGoal = {
  name: 'Emergency fund',
  categoryId: 3,
  categoryLabelSnapshot: 'Savings',
  targetAmount: 5000,
};

describe('CreateGoalDto', () => {
  it('accepts required fields when optional fields are omitted', () => {
    const goal = plainToInstance(CreateGoalDto, requiredGoal);

    expect(validateSync(goal)).toEqual([]);
  });

  it('transforms a numeric category ID and accepts valid optional details', () => {
    const goal = plainToInstance(CreateGoalDto, {
      ...requiredGoal,
      categoryId: '3',
      description: 'Build a three-month reserve',
      icon: 'shield',
      currentAmount: 750,
      deadline: '2027-12-31T00:00:00.000Z',
    });

    expect(goal.categoryId).toBe(3);
    expect(validateSync(goal)).toEqual([]);
  });

  it.each([
    { name: '' },
    { name: 12 },
    { categoryId: undefined },
    { categoryId: 'not-a-number' },
    { categoryId: 1.5 },
    { categoryLabelSnapshot: '' },
    { categoryLabelSnapshot: 12 },
    { targetAmount: undefined },
    { targetAmount: '5000' },
  ])('rejects invalid required goal values: %o', (overrides) => {
    const goal = plainToInstance(CreateGoalDto, { ...requiredGoal, ...overrides });

    expect(validateSync(goal).length).toBeGreaterThan(0);
  });

  it.each([
    { description: 12 },
    { icon: 12 },
    { currentAmount: '750' },
    { deadline: 'not-a-date' },
  ])('rejects invalid optional goal values: %o', (overrides) => {
    const goal = plainToInstance(CreateGoalDto, { ...requiredGoal, ...overrides });

    expect(validateSync(goal).length).toBeGreaterThan(0);
  });
});