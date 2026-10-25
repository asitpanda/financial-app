import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategories } from '../categories/categories.api';
import { getFinancialAccounts } from '../accounts/financialAccounts.api';
import { getGoals } from '../goals/goals.api';
import { getInvestmentAssetTaxonomy } from '../investments/api/investmentAssetTaxonomy.api';
import { getInvestments } from '../investments/api/investments.api';
import { getTransactions } from '../transactions/transactions.api';
import { useNotificationStore } from '../../store/notificationStore';
import { useDashboard } from './useDashboard';

vi.mock('../categories/categories.api', () => ({ getCategories: vi.fn() }));
vi.mock('../accounts/financialAccounts.api', () => ({ getFinancialAccounts: vi.fn() }));
vi.mock('../goals/goals.api', () => ({ getGoals: vi.fn() }));
vi.mock('../investments/api/investmentAssetTaxonomy.api', () => ({ getInvestmentAssetTaxonomy: vi.fn() }));
vi.mock('../investments/api/investments.api', () => ({ getInvestments: vi.fn() }));
vi.mock('../transactions/transactions.api', () => ({ getTransactions: vi.fn() }));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children,
  );
};

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTransactions).mockResolvedValue([{ id: 1 }] as never);
    vi.mocked(getGoals).mockResolvedValue([{ id: 2 }] as never);
    vi.mocked(getCategories).mockResolvedValue([{ id: 3 }] as never);
    vi.mocked(getFinancialAccounts).mockResolvedValue([{ id: 4 }] as never);
    vi.mocked(getInvestments).mockResolvedValue({ data: [{ id: 5 }] } as never);
    vi.mocked(getInvestmentAssetTaxonomy).mockResolvedValue([{ id: 6 }] as never);
    useNotificationStore.setState({ notifications: [] });
  });

  it('loads all dashboard resources under the dedicated query key', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({
      transactions: [{ id: 1 }], goals: [{ id: 2 }], categories: [{ id: 3 }],
      accounts: [{ id: 4 }], investments: [{ id: 5 }], taxonomyNodes: [{ id: 6 }],
    });
  });

  it('turns individual resource failures and malformed values into empty arrays', async () => {
    vi.mocked(getTransactions).mockRejectedValue(new Error('offline'));
    vi.mocked(getCategories).mockResolvedValue(null as never);

    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toMatchObject({ transactions: [], categories: [], goals: [{ id: 2 }] });
    expect(result.current.error).toBeNull();
  });

  it('notifies on a query-level failure', async () => {
    vi.mocked(getTransactions).mockImplementation(() => { throw new Error('fatal'); });
    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(useNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({ type: 'error', message: 'Failed to load dashboard' }),
    ]);
  });

  it('exposes reload and refetches the complete dashboard resource set', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getTransactions).toHaveBeenCalledOnce();

    await result.current.reload();

    expect(getTransactions).toHaveBeenCalledTimes(2);
    expect(getGoals).toHaveBeenCalledTimes(2);
    expect(getCategories).toHaveBeenCalledTimes(2);
    expect(getFinancialAccounts).toHaveBeenCalledTimes(2);
    expect(getInvestments).toHaveBeenCalledTimes(2);
    expect(getInvestmentAssetTaxonomy).toHaveBeenCalledTimes(2);
  });
});