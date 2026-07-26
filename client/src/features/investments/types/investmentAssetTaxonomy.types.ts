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

export interface UpdateInvestmentAssetTaxonomyDto
  extends Partial<CreateInvestmentAssetTaxonomyDto> {}
