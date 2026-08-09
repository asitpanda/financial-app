import type { ValuationSnapshotRecord } from '../valuation-snapshot.types';
import type { CreateValuationSnapshotDto } from '../dto/create-valuation-snapshot.dto';
import type { UpdateValuationSnapshotDto } from '../dto/update-valuation-snapshot.dto';

export interface IValuationSnapshotDataSourcePort {
  create(data: CreateValuationSnapshotDto): Promise<ValuationSnapshotRecord>;
  findAll(userId: number): Promise<ValuationSnapshotRecord[]>;
  findAllByInvestment(investmentId: string): Promise<ValuationSnapshotRecord[]>;
  findOne(id: string): Promise<ValuationSnapshotRecord | null>;
  update(id: string, data: UpdateValuationSnapshotDto): Promise<ValuationSnapshotRecord | null>;
  delete(id: string): Promise<void>;
}
