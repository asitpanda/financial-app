import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardRecentTransactionsSection from './DashboardRecentTransactionsSection';

describe('DashboardRecentTransactionsSection', () => {
  it('renders signed amounts and category labels', () => {
    render(<DashboardRecentTransactionsSection recentTransactions={[{ id: 'tx-1', type: 'EXPENSE', amount: 250, category: 'Food', date: '2026-01-02' } as never]} categoryLookup={new Map()} onOpenTransactions={vi.fn()} onAddTransaction={vi.fn()} />);
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('-₹250')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
  });

  it('offers add transaction from the empty state', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn();
    render(<DashboardRecentTransactionsSection recentTransactions={[]} categoryLookup={new Map()} onOpenTransactions={vi.fn()} onAddTransaction={onAddTransaction} />);
    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));
    expect(onAddTransaction).toHaveBeenCalledOnce();
  });
});