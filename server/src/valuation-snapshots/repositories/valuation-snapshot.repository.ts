import { Inject, Injectable } from '@nestjs/common';
import type { ValuationSnapshotRecord } from '../valuation-snapshot.types';
import type { CreateValuationSnapshotDto } from '../dto/create-valuation-snapshot.dto';
import type { UpdateValuationSnapshotDto } from '../dto/update-valuation-snapshot.dto';
import { IValuationSnapshotDataSourcePort } from './valuation-snapshot.datasource.port';

@Injectable()
export class ValuationSnapshotRepository {
  constructor(
    @Inject('VALUATION_SNAPSHOT_DATA_SOURCE')
    private readonly dataSource: IValuationSnapshotDataSourcePort,
  ) {}

  async create(data: CreateValuationSnapshotDto): Promise<ValuationSnapshotRecord> {
    return this.dataSource.create(data);
  }

  async findAll(userId: number): Promise<ValuationSnapshotRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findAllByInvestment(investmentId: string): Promise<ValuationSnapshotRecord[]> {
    return this.dataSource.findAllByInvestment(investmentId);
  }

  async findOne(id: string): Promise<ValuationSnapshotRecord | null> {
    return this.dataSource.findOne(id);
  }

  async update(id: string, data: UpdateValuationSnapshotDto): Promise<ValuationSnapshotRecord | null> {
    return this.dataSource.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.dataSource.delete(id);
  }
}
