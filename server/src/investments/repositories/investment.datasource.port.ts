export interface IInvestmentDataSourcePort {
  create(data: any, userId: number): Promise<any>;
  findAll(userId: number): Promise<any[]>;
  findOne(id: number, userId: number): Promise<any>;
  findById(id: number): Promise<any>;
  update(id: number, data: any, userId: number): Promise<any>;
  delete(id: number, userId: number): Promise<void>;
}
