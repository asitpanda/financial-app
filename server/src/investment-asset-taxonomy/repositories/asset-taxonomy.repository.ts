import { Inject, Injectable } from '@nestjs/common';
import { IAssetTaxonomyDataSourcePort } from './asset-taxonomy.datasource.port';

@Injectable()
export class AssetTaxonomyRepository {
  constructor(
    @Inject('INVESTMENT_ASSET_TAXONOMY_DATA_SOURCE')
    private readonly dataSource: IAssetTaxonomyDataSourcePort,
  ) {}

  async create(data: any): Promise<any> {
    return this.dataSource.create(data);
  }

  async findAll(userId: number): Promise<any[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: number, userId: number, data: any): Promise<any> {
    return this.dataSource.update(id, userId, data);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
