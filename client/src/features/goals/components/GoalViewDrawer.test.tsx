import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalViewDrawer } from './GoalViewDrawer';
import { renderWithProviders, screen } from '../../../test/test-utils';

const goal = {
  id: 'goal-1',
  name: 'Emergency fund',
  category: 'Savings',
  targetAmount: 1000,
  currentAmount: 400,
  deadline: '2099-12-31',
  userId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GoalViewDrawer', () => {
  it('shows a not-found state when the goal is missing', () => {
    const onClose = vi.fn();
    renderWithProviders(<GoalViewDrawer open onClose={onClose} />);

    expect(screen.getByText('Goal not found')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders goal progress, linked contributions, and actions', () => {
    const onClose = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onAddTransaction = vi.fn();
    const onViewAllTransactions = vi.fn();
    renderWithProviders(
      <GoalViewDrawer
        open
        goal={goal}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddTransaction={onAddTransaction}
        onViewAllTransactions={onViewAllTransactions}
        transactions={[
          { id: 'tx-1', goalId: 'goal-1', amount: 100, type: 'income', date: '2026-02-01' },
          { id: 'tx-2', goalId: 'goal-1', amount: 25, type: 'expense', date: '2026-02-02' },
        ]}
      />,
    );

    expect(screen.getByText('Emergency fund')).toBeInTheDocument();
    expect(screen.getByText('Transaction Contributions')).toBeInTheDocument();
    expect(screen.getByText('+₹100')).toBeInTheDocument();
    expect(screen.getByText('+₹25')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Goal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Transaction' }));

    expect(onEdit).toHaveBeenCalledWith(goal);
    expect(onDelete).toHaveBeenCalledWith(goal);
    expect(onAddTransaction).toHaveBeenCalledWith(goal);
  });
});
