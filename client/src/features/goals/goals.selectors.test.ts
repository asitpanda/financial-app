import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { getFilteredGoals, getGoalHealth, getGoalInsights, getGoalProgressChart, getGoalRows, getProgress } from './goals.selectors';
import type { GoalRecord } from './goal.types';

const goal = (overrides: Partial<GoalRecord> = {}): GoalRecord => ({
  id: 'goal-1',
  name: 'Emergency fund',
  category: 'Savings',
  targetAmount: 1000,
  currentAmount: 400,
  startDate: '2026-01-01',
  deadline: '2099-12-31',
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('goal selectors', () => {
  it('calculates bounded progress and stable ids', () => {
    expect(getProgress(goal({ currentAmount: 1250 }))).toBe(100);
    expect(getProgress(goal({ targetAmount: 0, currentAmount: 10 }))).toBe(0);
    expect(getGoalRows([goal({ _id: 'mongo-1' })])[0]).toMatchObject({ id: 'mongo-1', progress: 40 });
  });

  it('classifies completed, overdue, and at-risk goals', () => {
    expect(getGoalHealth(goal({ currentAmount: 1000 })).label).toBe('Completed');
    expect(getGoalHealth(goal({ deadline: dayjs().subtract(1, 'day').toISOString() })).label).toBe('Overdue');
    expect(getGoalHealth(goal({ currentAmount: 100, deadline: undefined }))).toMatchObject({ label: 'At Risk', tone: 'warning' });
  });

  it('filters goals by search, progress bucket, and date range', () => {
    const goals = [
      goal(),
      goal({ id: 'goal-2', name: 'Holiday', currentAmount: 1000, deadline: '2026-11-01' }),
    ];

    expect(getFilteredGoals(goals, { search: 'holiday', progressFilter: 'completed', dateRange: [null, null] })).toHaveLength(1);
    expect(getFilteredGoals(goals, { search: '', progressFilter: 'all', dateRange: [dayjs('2026-10-01'), dayjs('2026-12-01')] })).toHaveLength(1);
  });

  it('aggregates insights and chart segments without changing source order', () => {
    const goals = [goal(), goal({ id: 'goal-2', name: 'Holiday', targetAmount: 500, currentAmount: 500, deadline: '2026-11-01' })];
    const insights = getGoalInsights(goals);

    expect(insights).toMatchObject({ totalTarget: 1500, totalSaved: 900, completed: 1, totalGoals: 2, progressPercent: 60 });
    expect(insights.upcomingDeadlines.map(({ id }) => id)).toEqual(['goal-2', 'goal-1']);
    expect(getGoalProgressChart(goals, goals.length).segments.map(({ count }) => count).reduce((a, b) => a + b, 0)).toBe(2);
  });
});
