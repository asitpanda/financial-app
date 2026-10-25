import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import { useDashboard } from './useDashboard';
import { useInvestmentMetadata } from '../investments/hooks/useInvestments';
import { useCreateGoal, useUpdateGoal } from '../goals/useGoals';
import { saveTransaction } from '../transactions/transactions.service';
import { createCategory } from '../categories/categories.api';
import { createInvestment, getInvestments } from '../investments/api/investments.api';
import { getFinancialAccounts } from '../accounts/financialAccounts.api';
import { navigateTo } from '../../services/navigation';

vi.mock('./useDashboard', () => ({ useDashboard: vi.fn() }));
vi.mock('../investments/hooks/useInvestments', () => ({ useInvestmentMetadata: vi.fn() }));
vi.mock('../goals/useGoals', () => ({ useCreateGoal: vi.fn(), useUpdateGoal: vi.fn() }));
vi.mock('../transactions/transactions.service', () => ({ saveTransaction: vi.fn() }));
vi.mock('../transactions/components/TransactionsAddEditDrawer', () => ({
  default: ({ open, onSubmit }: { open: boolean; onSubmit: (payload: unknown) => void }) =>
    open ? <button type="button" onClick={() => onSubmit({ type: 'INCOME', amount: 10, category: 'Salary' })}>Submit Transaction</button> : null,
}));
vi.mock('../goals/components/GoalFormDrawer', () => ({
  default: ({ open, onSubmit }: { open: boolean; onSubmit: (payload: unknown) => void }) =>
    open ? <button type="button" onClick={() => onSubmit({ name: 'Emergency Fund' })}>Submit Goal</button> : null,
}));
vi.mock('../categories/components/CategoriesFormDrawer', () => ({
  default: ({ open, onSubmit }: { open: boolean; onSubmit: (payload: unknown) => void }) =>
    open ? <button type="button" onClick={() => onSubmit({ name: 'Food', type: 'expense' })}>Submit Category</button> : null,
}));
vi.mock('../investments/components/InvestmentFormDrawer', () => ({
  default: ({ open, onSubmit }: { open: boolean; onSubmit: (payload: unknown) => void }) =>
    open ? <button type="button" onClick={() => onSubmit({ name: 'Index Fund', type: 'equity', category: 'equity', institution: '', totalInvested: '100', currentValue: '100', startDate: '2026-01-01', maturityDate: '', status: 'active', accountId: '', insuranceCover: '', contributionType: 'one_time', referenceNumber: '', notes: '', expectedBenefits: [] })}>Submit Investment</button> : null,
}));
vi.mock('../accounts/components/FinancialAccountFormDrawer', () => ({
  default: ({ open, onUpdated }: { open: boolean; onUpdated: () => void }) =>
    open ? <button type="button" onClick={onUpdated}>Refresh Account</button> : null,
}));
vi.mock('../categories/categories.api', () => ({ createCategory: vi.fn() }));
vi.mock('../investments/api/investments.api', () => ({ createInvestment: vi.fn(), getInvestments: vi.fn() }));
vi.mock('../accounts/financialAccounts.api', () => ({ getFinancialAccounts: vi.fn() }));
vi.mock('../../services/navigation', () => ({ navigateTo: vi.fn() }));

const emptyData = {
  transactions: [],
  goals: [],
  categories: [],
  accounts: [],
  investments: [],
  taxonomyNodes: [],
};

const renderDashboard = (queryClient?: QueryClient) =>
  renderWithProviders(
    <Dashboard onOpenTransactionsFromDashboard={vi.fn()} />,
    queryClient ? { queryClient } : undefined,
  );

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInvestmentMetadata).mockReturnValue({ data: { asset_configs: [] } } as never);
    vi.mocked(useCreateGoal).mockReturnValue({ mutateAsync: vi.fn() } as never);
    vi.mocked(useUpdateGoal).mockReturnValue({ mutateAsync: vi.fn() } as never);
  });

  it('shows the loading state before page data arrives', () => {
    vi.mocked(useDashboard).mockReturnValue({ data: undefined, loading: true, error: null } as never);
    renderDashboard();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the dashboard and warns when a transaction prerequisite is missing', async () => {
    vi.mocked(useDashboard).mockReturnValue({ data: emptyData, loading: false, error: null } as never);
    renderDashboard();
    expect(screen.getByText('Account Overview')).toBeInTheDocument();
    expect(screen.getByText('Goals Overview')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Add Transaction' })[0]);
    await waitFor(() => expect(screen.getByText('Add at least one category before creating a transaction.')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Add Investments/ }));
    expect(screen.getByText('Add at least one financial account before creating an investment.')).toBeInTheDocument();
  });

  it('shows the dashboard error banner when the page query fails', async () => {
    vi.mocked(useDashboard).mockReturnValue({ data: undefined, loading: false, error: new Error('offline') } as never);
    renderDashboard();
    expect(await screen.findByText('Failed to load dashboard')).toBeInTheDocument();
  });

  it('passes prefetched transactions through the dashboard navigation callback', async () => {
    const user = userEvent.setup();
    const onOpenTransactionsFromDashboard = vi.fn();
    const transaction = { id: 'tx-1', type: 'INCOME', amount: 50, category: 'Salary', date: '2026-01-01' };
    vi.mocked(useDashboard).mockReturnValue({ data: { ...emptyData, transactions: [transaction] }, loading: false, error: null } as never);
    renderWithProviders(<Dashboard onOpenTransactionsFromDashboard={onOpenTransactionsFromDashboard} />);

    await user.click(screen.getAllByRole('button', { name: 'View All' })[0]);
    expect(onOpenTransactionsFromDashboard).toHaveBeenCalledWith({
      prefetchedTransactions: [expect.objectContaining({ id: 'tx-1' })],
      prefillFilter: null,
    });
  });

  it('navigates from the investment and category overview actions', async () => {
    const user = userEvent.setup();
    vi.mocked(useDashboard).mockReturnValue({ data: emptyData, loading: false, error: null } as never);
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Open Investments' }));
    await user.click(screen.getAllByRole('button', { name: 'View All' })[1]);
    expect(navigateTo).toHaveBeenCalledWith('investments');
    expect(navigateTo).toHaveBeenCalledWith('categories');
  });

  it('keeps the category drawer open and returns an API error', async () => {
    const user = userEvent.setup();
    vi.mocked(createCategory).mockRejectedValue(new Error('Category exists'));
    vi.mocked(useDashboard).mockReturnValue({ data: emptyData, loading: false, error: null } as never);
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Add Category/ }));
    await user.click(screen.getByRole('button', { name: 'Submit Category' }));
    expect(await screen.findByRole('button', { name: 'Submit Category' })).toBeInTheDocument();
    expect(createCategory).toHaveBeenCalledWith({ name: 'Food', type: 'expense' });
  });

  it('keeps the goal drawer open when goal creation fails', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Goal failed'));
    vi.mocked(useCreateGoal).mockReturnValue({ mutateAsync } as never);
    vi.mocked(useDashboard).mockReturnValue({ data: emptyData, loading: false, error: null } as never);
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Add Goal/ }));
    await user.click(screen.getByRole('button', { name: 'Submit Goal' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ name: 'Emergency Fund' }));
    expect(screen.getByRole('button', { name: 'Submit Goal' })).toBeInTheDocument();
  });

  it('closes the category drawer and invalidates categories after creation', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(createCategory).mockResolvedValue({ id: 'category-1', name: 'Food' } as never);
    vi.mocked(useDashboard).mockReturnValue({ data: emptyData, loading: false, error: null } as never);
    renderDashboard(queryClient);

    await user.click(screen.getByRole('button', { name: /Add Category/ }));
    await user.click(screen.getByRole('button', { name: 'Submit Category' }));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['categories'] }));
    expect(screen.queryByRole('button', { name: 'Submit Category' })).not.toBeInTheDocument();
  });

  it('closes the goal drawer after a successful goal creation', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'goal-1' });
    vi.mocked(useCreateGoal).mockReturnValue({ mutateAsync } as never);
    vi.mocked(useDashboard).mockReturnValue({ data: emptyData, loading: false, error: null } as never);
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Add Goal/ }));
    await user.click(screen.getByRole('button', { name: 'Submit Goal' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ name: 'Emergency Fund' }));
    expect(screen.queryByRole('button', { name: 'Submit Goal' })).not.toBeInTheDocument();
  });

  it('refreshes accounts after the account drawer reports an update', async () => {
    const user = userEvent.setup();
    vi.mocked(getFinancialAccounts).mockResolvedValue([{ id: 'account-1', displayName: 'Savings' }] as never);
    vi.mocked(useDashboard).mockReturnValue({ data: { ...emptyData, accounts: [{ id: 'account-1', displayName: 'Savings' }] }, loading: false, error: null } as never);
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Add Account/ }));
    await user.click(screen.getByRole('button', { name: 'Refresh Account' }));
    await waitFor(() => expect(getFinancialAccounts).toHaveBeenCalled());
  });

  it('creates an investment and closes its drawer', async () => {
    const user = userEvent.setup();
    vi.mocked(createInvestment).mockResolvedValue({ id: 'investment-1' } as never);
    vi.mocked(getInvestments).mockResolvedValue({ data: [{ id: 'investment-1' }] } as never);
    vi.mocked(useDashboard).mockReturnValue({ data: { ...emptyData, accounts: [{ id: 'account-1', name: 'Savings' }] }, loading: false, error: null } as never);
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Add Investments/ }));
    await user.click(screen.getByRole('button', { name: 'Submit Investment' }));
    await waitFor(() => expect(createInvestment).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Submit Investment' })).not.toBeInTheDocument();
  });

  it('invalidates the transactions query after a successful quick add', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(saveTransaction).mockResolvedValue({ id: 'tx-1', type: 'INCOME', amount: 10 } as never);
    vi.mocked(useDashboard).mockReturnValue({ data: { ...emptyData, categories: [{ id: 'category-1', name: 'Salary' }], accounts: [{ id: 'account-1', name: 'Savings' }] }, loading: false, error: null } as never);

    renderDashboard(queryClient);
    await user.click(screen.getAllByRole('button', { name: 'Add Transaction' })[0]);
    await user.click(screen.getByRole('button', { name: 'Submit Transaction' }));
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] }));
  });
});