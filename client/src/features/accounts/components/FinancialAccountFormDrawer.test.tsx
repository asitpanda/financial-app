import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import {
  createFinancialAccount,
  updateFinancialAccount,
} from '../financialAccounts.api';
import FinancialAccountFormDrawer from './FinancialAccountFormDrawer';

vi.mock('../financialAccounts.api', () => ({
  createFinancialAccount: vi.fn(),
  updateFinancialAccount: vi.fn(),
}));

const account = {
  id: 'account-1',
  name: 'icici-savings',
  displayName: 'ICICI Savings',
  accountType: 'bank',
  institutionName: 'ICICI Bank',
  accountNumberMasked: 'XXXX2211',
  currency: 'INR',
  isActive: true,
  openingBalance: 1000,
  currentBalance: 1200,
};

describe('FinancialAccountFormDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createFinancialAccount).mockResolvedValue(account);
    vi.mocked(updateFinancialAccount).mockResolvedValue(account);
  });

  it('creates an account with normalized values and invalidates dependent queries', async () => {
    const userEventInstance = userEvent.setup();
    const onClose = vi.fn();
    const onUpdated = vi.fn();
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    renderWithProviders(
      <FinancialAccountFormDrawer open onClose={onClose} onUpdated={onUpdated} />,
      { queryClient },
    );

    await userEventInstance.type(screen.getByLabelText('Internal Name'), '  savings  ');
    await userEventInstance.type(screen.getByLabelText('Display Name'), '  Savings Account  ');
    await userEventInstance.clear(screen.getByLabelText('Currency'));
    await userEventInstance.type(screen.getByLabelText('Currency'), 'usd');
    await userEventInstance.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(createFinancialAccount).toHaveBeenCalledWith({
      name: 'savings',
      displayName: 'Savings Account',
      accountType: 'bank',
      institutionName: undefined,
      accountNumberMasked: undefined,
      currency: 'USD',
      isActive: true,
      openingBalance: 0,
    }));
    expect(onUpdated).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions', 'page-data'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['investments', 'reference-data'] });
  });

  it('updates an account without sending the create-only opening balance', async () => {
    const userEventInstance = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <FinancialAccountFormDrawer
        open
        onClose={onClose}
        onUpdated={vi.fn()}
        initialValues={account as never}
        title="Edit Account"
        submitLabel="Save"
      />,
    );

    await userEventInstance.clear(screen.getByLabelText('Display Name'));
    await userEventInstance.type(screen.getByLabelText('Display Name'), 'Updated Savings');
    await userEventInstance.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(updateFinancialAccount).toHaveBeenCalledOnce());
    expect(updateFinancialAccount).toHaveBeenCalledWith('account-1', {
      name: 'icici-savings',
      displayName: 'Updated Savings',
      accountType: 'bank',
      institutionName: 'ICICI Bank',
      accountNumberMasked: 'XXXX2211',
      currency: 'INR',
      isActive: true,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not submit invalid required fields', async () => {
    const userEventInstance = userEvent.setup();

    renderWithProviders(
      <FinancialAccountFormDrawer open onClose={vi.fn()} onUpdated={vi.fn()} />,
    );

    await userEventInstance.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Internal name is required')).toBeInTheDocument();
    expect(screen.getByText('Display name is required')).toBeInTheDocument();
    expect(createFinancialAccount).not.toHaveBeenCalled();
  });

  it('shows the API error and keeps the drawer open when creation fails', async () => {
    const userEventInstance = userEvent.setup();
    const onClose = vi.fn();
    vi.mocked(createFinancialAccount).mockRejectedValue(new Error('Account already exists'));

    renderWithProviders(
      <FinancialAccountFormDrawer open onClose={onClose} onUpdated={vi.fn()} />,
    );

    await userEventInstance.type(screen.getByLabelText('Internal Name'), 'savings');
    await userEventInstance.type(screen.getByLabelText('Display Name'), 'Savings');
    await userEventInstance.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Account already exists')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without submitting when cancel is clicked', async () => {
    const userEventInstance = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <FinancialAccountFormDrawer open onClose={onClose} onUpdated={vi.fn()} />,
    );

    await userEventInstance.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(createFinancialAccount).not.toHaveBeenCalled();
    expect(updateFinancialAccount).not.toHaveBeenCalled();
  });
});