export interface IValuationSnapshotDataSourcePort {
  create(data: any): Promise<any>;
  findAllByInvestment(investmentId: string): Promise<any[]>;
  findOne(id: string): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
}
