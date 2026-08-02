import { Inject, Injectable } from '@nestjs/common';
import { IValuationSnapshotDataSourcePort } from './valuation-snapshot.datasource.port';

@Injectable()
export class ValuationSnapshotRepository {
  constructor(
    @Inject('VALUATION_SNAPSHOT_DATA_SOURCE')
    private readonly dataSource: IValuationSnapshotDataSourcePort,
  ) {}

  async create(data: any): Promise<any> {
    return this.dataSource.create(data);
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return this.dataSource.findAllByInvestment(investmentId);
  }

  async findOne(id: string): Promise<any> {
    return this.dataSource.findOne(id);
  }

  async update(id: string, data: any): Promise<any> {
    return this.dataSource.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.dataSource.delete(id);
  }
}
