import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardGoalsOverviewSection from './DashboardGoalsOverviewSection';

const goal = { id: 'goal-1', name: 'Emergency Fund', targetAmount: 1000, currentAmount: 250, deadline: '2026-12-31' };

describe('DashboardGoalsOverviewSection', () => {
  it('renders progress and sends the selected goal to edit', async () => {
    const user = userEvent.setup();
    const onEditGoal = vi.fn();
    render(<DashboardGoalsOverviewSection goals={[goal] as never} visibleGoals={[goal] as never} activeGoalsCount={1} onViewAll={vi.fn()} onCreateGoal={vi.fn()} onEditGoal={onEditGoal} />);
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit Emergency Fund' }));
    expect(onEditGoal).toHaveBeenCalledWith(goal);
  });

  it('shows the create action when there are no goals', async () => {
    const user = userEvent.setup();
    const onCreateGoal = vi.fn();
    render(<DashboardGoalsOverviewSection goals={[]} visibleGoals={[]} activeGoalsCount={0} onViewAll={vi.fn()} onCreateGoal={onCreateGoal} onEditGoal={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Create Goal' }));
    expect(onCreateGoal).toHaveBeenCalledOnce();
  });
});