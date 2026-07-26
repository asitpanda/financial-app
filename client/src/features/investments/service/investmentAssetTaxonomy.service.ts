import investmentAssetTaxonomyApi from '../api/investmentAssetTaxonomy.api';
import type {
	CreateInvestmentAssetTaxonomyDto,
	InvestmentAssetTaxonomyNode,
	UpdateInvestmentAssetTaxonomyDto,
} from '../types/investmentAssetTaxonomy.types';

export interface InvestmentAssetTaxonomySavePayload
	extends UpdateInvestmentAssetTaxonomyDto {
	id?: string | number;
}

export const saveInvestmentAssetTaxonomy = async (
	payload: InvestmentAssetTaxonomySavePayload,
): Promise<InvestmentAssetTaxonomyNode> => {
	if (payload.id != null && payload.id !== '') {
		const { id, ...updatePayload } = payload;
		return investmentAssetTaxonomyApi.update(id, updatePayload);
	}

	return investmentAssetTaxonomyApi.create(
		payload as CreateInvestmentAssetTaxonomyDto,
	);
};

export const removeInvestmentAssetTaxonomy = async (id: string | number) => {
	await investmentAssetTaxonomyApi.delete(id);
};
