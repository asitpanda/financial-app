import { Inject, Injectable } from '@nestjs/common';
import type { InvestmentAssetTaxonomyRecord } from '../investment-asset-taxonomy.types';
import type {
  InvestmentAssetTaxonomyUpdateInput,
  InvestmentAssetTaxonomyWriteInput,
} from '../investment-asset-taxonomy.types';
import { IAssetTaxonomyDataSourcePort } from './asset-taxonomy.datasource.port';

@Injectable()
export class AssetTaxonomyRepository {
  constructor(
    @Inject('INVESTMENT_ASSET_TAXONOMY_DATA_SOURCE')
    private readonly dataSource: IAssetTaxonomyDataSourcePort,
  ) {}

  async create(data: InvestmentAssetTaxonomyWriteInput): Promise<InvestmentAssetTaxonomyRecord> {
    return this.dataSource.create(data);
  }

  async findAll(userId: number): Promise<InvestmentAssetTaxonomyRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<InvestmentAssetTaxonomyRecord | null> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: number, userId: number, data: InvestmentAssetTaxonomyUpdateInput): Promise<InvestmentAssetTaxonomyRecord | null> {
    return this.dataSource.update(id, userId, data);
  }

  async updateLevelsForDescendants(userId: number, updates: Array<{ id: number; level: number }>): Promise<void> {
    return this.dataSource.updateLevelsForDescendants(userId, updates);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
