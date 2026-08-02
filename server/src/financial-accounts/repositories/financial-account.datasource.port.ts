export interface IFinancialAccountDataSourcePort {
  create(data: any, userId: string): Promise<any>;
  findAll(userId: string): Promise<any[]>;
  findOne(id: string, userId: string): Promise<any>;
  update(id: string, data: any, userId: string): Promise<any>;
  delete(id: string, userId: string): Promise<void>;
}
