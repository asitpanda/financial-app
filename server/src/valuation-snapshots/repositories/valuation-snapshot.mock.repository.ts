import { Injectable } from '@nestjs/common';
import type { ValuationSnapshotRecord } from '../valuation-snapshot.types';
import { CreateValuationSnapshotDto } from '../dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from '../dto/update-valuation-snapshot.dto';
import { IValuationSnapshotDataSourcePort } from './valuation-snapshot.datasource.port';
import { mockValuationSnapshotsData } from '../../mockdata';
import { InvestmentRepository } from '../../investments/repositories/investment.repository';

let mockValuationSnapshots = [...mockValuationSnapshotsData];

const nextSnapshotId = () => (mockValuationSnapshots.length ? Math.max(...mockValuationSnapshots.map((snapshot) => snapshot.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class ValuationSnapshotMockRepository implements IValuationSnapshotDataSourcePort {
  constructor(private readonly investmentRepository: InvestmentRepository) {}

  private async syncValue(investmentId: number) {
    const investment = await this.investmentRepository.findById(investmentId);
    if (!investment || investment.status.toLowerCase() === 'closed') return;
    const latest = mockValuationSnapshots
      .filter((snapshot) => snapshot.investmentId === investmentId)
      .sort((left, right) => new Date(right.snapshotDate).getTime() - new Date(left.snapshotDate).getTime() || right.id - left.id)[0];
    await this.investmentRepository.update(investmentId, {
      currentValue: latest?.marketValue ?? investment.totalInvested,
      currentValueSource: latest ? 'valuation_snapshot' : 'manual',
      lastValuationAt: latest ? new Date(latest.snapshotDate).toISOString() : null,
    }, investment.userId);
  }

  async findAll(userId: number): Promise<ValuationSnapshotRecord[]> {
    return mockValuationSnapshots.filter(
      (snapshot) => snapshot.userId === userId,
    );
  }

  async create(data: CreateValuationSnapshotDto): Promise<ValuationSnapshotRecord> {
    const timestamp = new Date();
    const newSnapshot: ValuationSnapshotRecord = {
      id: nextSnapshotId(),
      ...data,
      userId: Number(data.userId),
      investmentId: Number(data.investmentId),
      units: normalizeNullableNumber(data.units),
      price: normalizeNullableNumber(data.price),
      source: data.source ?? null,
      snapshotDate: new Date(data.snapshotDate),
      createdAt: timestamp,
    };

    mockValuationSnapshots.push(newSnapshot);
    await this.syncValue(newSnapshot.investmentId);
    return newSnapshot;
  }

  async findAllByInvestment(investmentId: string): Promise<ValuationSnapshotRecord[]> {
    return mockValuationSnapshots.filter((snapshot) => snapshot.investmentId === Number(investmentId));
  }

  async findOne(id: string): Promise<ValuationSnapshotRecord | null> {
    return mockValuationSnapshots.find((snapshot) => snapshot.id === Number(id));
  }

  async update(id: string, data: UpdateValuationSnapshotDto): Promise<ValuationSnapshotRecord | null> {
    const index = mockValuationSnapshots.findIndex((snapshot) => snapshot.id === Number(id));
    if (index === -1) return null;
    const previousInvestmentId = mockValuationSnapshots[index].investmentId;

    mockValuationSnapshots[index] = {
      ...mockValuationSnapshots[index],
      ...data,
      userId: data.userId !== undefined ? Number(data.userId) : mockValuationSnapshots[index].userId,
      investmentId: data.investmentId !== undefined ? Number(data.investmentId) : mockValuationSnapshots[index].investmentId,
      units: data.units !== undefined ? normalizeNullableNumber(data.units) : mockValuationSnapshots[index].units,
      price: data.price !== undefined ? normalizeNullableNumber(data.price) : mockValuationSnapshots[index].price,
      source: data.source !== undefined ? data.source : mockValuationSnapshots[index].source,
      snapshotDate: data.snapshotDate !== undefined ? new Date(data.snapshotDate) : mockValuationSnapshots[index].snapshotDate,
    };

    for (const investmentId of new Set([previousInvestmentId, mockValuationSnapshots[index].investmentId])) {
      await this.syncValue(investmentId);
    }
    return mockValuationSnapshots[index];
  }

  async delete(id: string): Promise<void> {
    const snapshot = await this.findOne(id);
    mockValuationSnapshots = mockValuationSnapshots.filter((snapshot) => snapshot.id !== Number(id));
    if (snapshot) await this.syncValue(snapshot.investmentId);
  }
}