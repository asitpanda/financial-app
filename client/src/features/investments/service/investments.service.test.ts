import { afterEach, describe, expect, it, vi } from 'vitest';
import investmentApi from '../api/investments.api';
import { removeInvestment, saveInvestment } from './investments.service';

afterEach(() => vi.restoreAllMocks());

describe('investments service', () => {
  it('creates an investment when no existing investment is selected', async () => {
    const create = vi.spyOn(investmentApi, 'create').mockResolvedValue({ id: 1 } as never);
    const payload = { name: 'Fund' } as never;

    await expect(saveInvestment({ payload })).resolves.toEqual({ id: 1 });

    expect(create).toHaveBeenCalledWith(payload);
  });

  it('updates an investment when an existing investment is selected', async () => {
    const update = vi.spyOn(investmentApi, 'update').mockResolvedValue({ id: 1 } as never);
    const payload = { name: 'Fund' } as never;

    await expect(saveInvestment({ payload, selectedInvestmentId: 7 })).resolves.toEqual({ id: 1 });

    expect(update).toHaveBeenCalledWith(7, payload);
  });

  it('removes an investment by id', async () => {
    const remove = vi.spyOn(investmentApi, 'delete').mockResolvedValue(undefined);

    await expect(removeInvestment(7)).resolves.toBeUndefined();

    expect(remove).toHaveBeenCalledWith(7);
  });
});