import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardQuickActionsSection from './DashboardQuickActionsSection';

describe('DashboardQuickActionsSection', () => {
  it('fires each quick action', async () => {
    const user = userEvent.setup();
    const actions = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    render(<DashboardQuickActionsSection categories={[]} goals={[]} transactions={[]} investments={[]} onAddTransaction={actions[0]} onAddGoal={actions[1]} onAddCategory={actions[2]} onAddInvestment={actions[3]} />);
    for (const name of ['Add Transaction', 'Add Goal', 'Add Category', 'Add Investments']) {
      await user.click(screen.getByRole('button', { name: new RegExp(name) }));
    }
    actions.forEach((action) => expect(action).toHaveBeenCalledOnce());
  });
});