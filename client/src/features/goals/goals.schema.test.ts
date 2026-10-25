import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { createDefaultGoalForm, goalSchema, toGoalFormState, validateGoalSavePayload } from './goals.schema';

describe('goal schema', () => {
  it('creates the default form state', () => {
    expect(createDefaultGoalForm()).toEqual({
      name: '',
      category: '',
      description: '',
      icon: 'gift',
      targetAmount: '',
      currentAmount: '',
      deadline: null,
    });
  });

  it('accepts valid values and coerces the target amount', () => {
    expect(goalSchema.parse({
      name: '  Emergency fund ',
      category: 'Savings',
      description: 'Six months of expenses',
      targetAmount: '100000',
      currentAmount: '25000',
      deadline: '2026-12-31',
    })).toMatchObject({
      name: 'Emergency fund',
      category: 'Savings',
      targetAmount: 100000,
      currentAmount: 25000,
    });
  });

  it('rejects missing required values and invalid amounts', () => {
    const result = goalSchema.safeParse({
      name: '',
      category: '',
      description: '',
      targetAmount: 0,
      currentAmount: -1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining([
      'Goal name is required',
      'Goal category is required',
      'Target amount must be greater than 0',
      'Current amount cannot be negative',
    ]));
  });

  it('maps an existing goal into editable form state and validates save payloads', () => {
    const goal = {
      name: 'Holiday',
      category: 'Travel',
      description: 'Trip fund',
      icon: 'airplane',
      targetAmount: 50000,
      currentAmount: 12000,
      deadline: '2026-11-01',
    };

    expect(toGoalFormState(goal)).toMatchObject({
      name: 'Holiday',
      icon: 'airplane',
      deadline: dayjs('2026-11-01'),
    });
    expect(() => validateGoalSavePayload({ ...goal, targetAmount: 1 })).not.toThrow();
    expect(() => validateGoalSavePayload({ ...goal, targetAmount: 0 })).toThrow();
  });
});
