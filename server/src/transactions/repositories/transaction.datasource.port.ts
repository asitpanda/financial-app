export interface ITransactionDataSourcePort {
  findAll(userId: number): Promise<any[]>;
  findOne(id: number, userId: number): Promise<any>;
  create(data: any, userId: number): Promise<any>;
  update(id: number, data: any, userId: number): Promise<any>;
  delete(id: number, userId: number): Promise<void>;
  findByDateRange(userId: number, startDate: Date, endDate: Date): Promise<any[]>;
  findByType(userId: number, type: string): Promise<any[]>;
}
