export interface InvestmentAssetTaxonomyNode {
  id: string | number;
  label: string;
  nodeType: string;
  level: number;
  parentId?: string | number | null;
  defaultAssetType?: string | null;
  defaultAssetCategory?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateInvestmentAssetTaxonomyDto {
  label: string;
  nodeType: string;
  level: number;
  parentId?: string | number;
  defaultAssetType?: string;
  defaultAssetCategory?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateInvestmentAssetTaxonomyDto
  extends Partial<CreateInvestmentAssetTaxonomyDto> {}
