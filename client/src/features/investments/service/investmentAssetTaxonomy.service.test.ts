import { afterEach, describe, expect, it, vi } from 'vitest';
import investmentAssetTaxonomyApi from '../api/investmentAssetTaxonomy.api';
import {
	removeInvestmentAssetTaxonomy,
	saveInvestmentAssetTaxonomy,
} from './investmentAssetTaxonomy.service';

afterEach(() => vi.restoreAllMocks());

describe('investment asset taxonomy service', () => {
	it('creates a taxonomy node when no id is provided', async () => {
		const create = vi.spyOn(investmentAssetTaxonomyApi, 'create').mockResolvedValue({ id: 1 } as never);
		const payload = { label: 'Fund', nodeType: 'category', level: 1 } as never;

		await expect(saveInvestmentAssetTaxonomy(payload)).resolves.toEqual({ id: 1 });

		expect(create).toHaveBeenCalledWith(payload);
	});

	it('updates a taxonomy node and removes its id from the update payload', async () => {
		const update = vi.spyOn(investmentAssetTaxonomyApi, 'update').mockResolvedValue({ id: 1 } as never);

		await expect(saveInvestmentAssetTaxonomy({ id: 7, label: 'Updated' })).resolves.toEqual({ id: 1 });

		expect(update).toHaveBeenCalledWith(7, { label: 'Updated' });
	});

	it('removes a taxonomy node by id', async () => {
		const remove = vi.spyOn(investmentAssetTaxonomyApi, 'delete').mockResolvedValue(undefined);

		await expect(removeInvestmentAssetTaxonomy(7)).resolves.toBeUndefined();

		expect(remove).toHaveBeenCalledWith(7);
	});
});