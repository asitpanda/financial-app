import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardAccountsSection from './DashboardAccountsSection';

describe('DashboardAccountsSection', () => {
  it('renders balances and opens the matching account for editing', async () => {
    const user = userEvent.setup();
    const onEditAccount = vi.fn();
    render(<DashboardAccountsSection accountOverviewRows={[{ name: 'Savings', balance: 1250, transactions: 2 }]} onAddAccount={vi.fn()} onEditAccount={onEditAccount} />);
    expect(screen.getByText('+₹1,250')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Savings/ }));
    expect(onEditAccount).toHaveBeenCalledWith('Savings');
  });

  it('shows the empty state and invokes add account', async () => {
    const user = userEvent.setup();
    const onAddAccount = vi.fn();
    render(<DashboardAccountsSection accountOverviewRows={[]} onAddAccount={onAddAccount} onEditAccount={vi.fn()} />);
    expect(screen.getByText('No account activity yet')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Add Account' })[1]);
    expect(onAddAccount).toHaveBeenCalledOnce();
  });
});