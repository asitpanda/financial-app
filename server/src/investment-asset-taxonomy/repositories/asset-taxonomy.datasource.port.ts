export interface IAssetTaxonomyDataSourcePort {
  create(data: any): Promise<any>;
  findAll(userId: number): Promise<any[]>;
  findOne(id: number, userId: number): Promise<any>;
  update(id: number, userId: number, data: any): Promise<any>;
  delete(id: number, userId: number): Promise<void>;
}
