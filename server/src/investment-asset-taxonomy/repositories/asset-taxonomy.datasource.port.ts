import type { InvestmentAssetTaxonomyRecord } from '../investment-asset-taxonomy.types';
import type {
  InvestmentAssetTaxonomyUpdateInput,
  InvestmentAssetTaxonomyWriteInput,
} from '../investment-asset-taxonomy.types';

export interface IAssetTaxonomyDataSourcePort {
  create(data: InvestmentAssetTaxonomyWriteInput): Promise<InvestmentAssetTaxonomyRecord>;
  findAll(userId: number): Promise<InvestmentAssetTaxonomyRecord[]>;
  findOne(id: number, userId: number): Promise<InvestmentAssetTaxonomyRecord | null>;
  update(id: number, userId: number, data: InvestmentAssetTaxonomyUpdateInput): Promise<InvestmentAssetTaxonomyRecord | null>;
  delete(id: number, userId: number): Promise<void>;
}
