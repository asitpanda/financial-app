export interface IInvestmentAssetTaxonomyRepository {
  create(data: any): Promise<any>;
  findAll(): Promise<any[]>;
  findOne(id: number): Promise<any>;
  update(id: number, data: any): Promise<any>;
  delete(id: number): Promise<void>;
}