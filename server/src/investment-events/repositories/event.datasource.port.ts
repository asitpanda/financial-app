export interface IEventDataSourcePort {
  create(data: any): Promise<any>;
  findAll(userId: number): Promise<any[]>;
  findAllByInvestment(investmentId: string): Promise<any[]>;
  findOne(id: string): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
}
