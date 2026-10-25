import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import { transactionApi } from './transactions.api';

afterEach(() => vi.restoreAllMocks());

describe('transactions.api', () => {
  it('supports CRUD, type filtering, and date-range filtering', async () => {
    const data = [{ id: 'transaction-1' }];
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data } as never);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data } as never);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data } as never);
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never);
    const payload = {} as Parameters<typeof transactionApi.create>[0];
    const updatePayload = {} as Parameters<typeof transactionApi.update>[1];

    await expect(transactionApi.getAll()).resolves.toBe(data);
    await expect(transactionApi.getById('transaction-1')).resolves.toBe(data);
    await expect(transactionApi.create(payload)).resolves.toBe(data);
    await expect(transactionApi.update('transaction-1', updatePayload)).resolves.toBe(data);
    await expect(transactionApi.delete('transaction-1')).resolves.toBeUndefined();
    await expect(transactionApi.getByType('EXPENSE')).resolves.toBe(data);
    await expect(transactionApi.getByDateRange('2026-01-01', '2026-01-31')).resolves.toBe(data);

    expect(get).toHaveBeenNthCalledWith(1, '/transactions');
    expect(get).toHaveBeenNthCalledWith(2, '/transactions/transaction-1');
    expect(get).toHaveBeenNthCalledWith(3, '/transactions?type=EXPENSE');
    expect(get).toHaveBeenNthCalledWith(
      4,
      '/transactions/date-range?startDate=2026-01-01&endDate=2026-01-31',
    );
    expect(post).toHaveBeenCalledWith('/transactions', payload);
    expect(patch).toHaveBeenCalledWith('/transactions/transaction-1', updatePayload);
    expect(remove).toHaveBeenCalledWith('/transactions/transaction-1');
  });
});