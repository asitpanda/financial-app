import { afterEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../api/client';
import {
  createFinancialAccount,
  deleteFinancialAccount,
  getFinancialAccountById,
  getFinancialAccounts,
  updateFinancialAccount,
} from './financialAccounts.api';

afterEach(() => vi.restoreAllMocks());

describe('financialAccounts.api', () => {
  it('gets all accounts and unwraps response data', async () => {
    const data = [{ id: 'account-1' }];
    const request = vi.spyOn(apiClient, 'get').mockResolvedValue({ data } as never);

    await expect(getFinancialAccounts()).resolves.toBe(data);
    expect(request).toHaveBeenCalledWith('/financial-accounts');
  });

  it('supports get, create, update, and delete operations', async () => {
    const data = { id: 'account-1' };
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data } as never);
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data } as never);
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data } as never);
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({} as never);
    const payload = {} as Parameters<typeof createFinancialAccount>[0];
    const updatePayload = {} as Parameters<typeof updateFinancialAccount>[1];

    await expect(getFinancialAccountById('account-1')).resolves.toBe(data);
    await expect(createFinancialAccount(payload)).resolves.toBe(data);
    await expect(updateFinancialAccount('account-1', updatePayload)).resolves.toBe(data);
    await expect(deleteFinancialAccount('account-1')).resolves.toBeUndefined();

    expect(get).toHaveBeenCalledWith('/financial-accounts/account-1');
    expect(post).toHaveBeenCalledWith('/financial-accounts', payload);
    expect(patch).toHaveBeenCalledWith('/financial-accounts/account-1', updatePayload);
    expect(remove).toHaveBeenCalledWith('/financial-accounts/account-1');
  });
});