import apiClient from './client';

export interface InvestmentAssetTaxonomyNode {
  id: string | number;
  label: string;
  nodeType: string;
  level: number;
  parentId?: string | number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateInvestmentAssetTaxonomyDto {
  label: string;
  nodeType: string;
  level: number;
  parentId?: string | number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateInvestmentAssetTaxonomyDto extends Partial<CreateInvestmentAssetTaxonomyDto> {}

export const getInvestmentAssetTaxonomy = async (): Promise<InvestmentAssetTaxonomyNode[]> => {
  const response = await apiClient.get('/investment-asset-taxonomy');
  return response.data;
};

export const createInvestmentAssetTaxonomy = async (
  payload: CreateInvestmentAssetTaxonomyDto
): Promise<InvestmentAssetTaxonomyNode> => {
  const response = await apiClient.post('/investment-asset-taxonomy', payload);
  return response.data;
};

export const updateInvestmentAssetTaxonomy = async (
  id: string | number,
  payload: UpdateInvestmentAssetTaxonomyDto
): Promise<InvestmentAssetTaxonomyNode> => {
  const response = await apiClient.patch(`/investment-asset-taxonomy/${id}`, payload);
  return response.data;
};

export const deleteInvestmentAssetTaxonomy = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/investment-asset-taxonomy/${id}`);
};

export const investmentAssetTaxonomyApi = {
  create: createInvestmentAssetTaxonomy,
  delete: deleteInvestmentAssetTaxonomy,
  getAll: getInvestmentAssetTaxonomy,
  update: updateInvestmentAssetTaxonomy,
};

export default investmentAssetTaxonomyApi;