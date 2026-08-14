import type { CreateInvestmentAssetTaxonomyDto } from './dto/create-investment-asset-taxonomy.dto';

export type InvestmentAssetTaxonomyRecord = {
  id: number;
  userId: number;
  label: string;
  nodeType: string;
  parentId: number | null;
  level: number;
  defaultAssetTypeMetaId?: number | null;
  defaultAssetCategoryMetaId?: number | null;
  defaultAssetType?: string | null;
  defaultAssetCategory?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InvestmentAssetTaxonomyWriteInput = CreateInvestmentAssetTaxonomyDto & {
  userId: number;
};

export type InvestmentAssetTaxonomyUpdateInput = Partial<CreateInvestmentAssetTaxonomyDto>;

export type InvestmentAssetTaxonomyLike = InvestmentAssetTaxonomyRecord;
