import { Injectable } from '@nestjs/common';
import { IValuationSnapshotDataSourcePort } from './valuation-snapshot.datasource.port';
import { mockValuationSnapshotsData } from '../../mockdata';

let mockValuationSnapshots = [...mockValuationSnapshotsData];

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);
const nextSnapshotId = () => (mockValuationSnapshots.length ? Math.max(...mockValuationSnapshots.map((snapshot) => snapshot.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class ValuationSnapshotMockRepository implements IValuationSnapshotDataSourcePort {
  async create(data: any): Promise<any> {
    const timestamp = new Date();
    const newSnapshot = {
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
    return newSnapshot;
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return mockValuationSnapshots.filter((snapshot) => snapshot.investmentId === Number(investmentId));
  }

  async findOne(id: string): Promise<any> {
    return mockValuationSnapshots.find((snapshot) => snapshot.id === Number(id));
  }

  async update(id: string, data: any): Promise<any> {
    const index = mockValuationSnapshots.findIndex((snapshot) => snapshot.id === Number(id));
    if (index === -1) return null;

    mockValuationSnapshots[index] = {
      ...mockValuationSnapshots[index],
      ...data,
      userId: data.userId !== undefined ? Number(data.userId) : mockValuationSnapshots[index].userId,
      investmentId: data.investmentId !== undefined ? Number(data.investmentId) : mockValuationSnapshots[index].investmentId,
      units: data.units !== undefined ? normalizeNullableNumber(data.units) : mockValuationSnapshots[index].units,
      price: data.price !== undefined ? normalizeNullableNumber(data.price) : mockValuationSnapshots[index].price,
      source: data.source !== undefined ? data.source : mockValuationSnapshots[index].source,
      snapshotDate: data.snapshotDate !== undefined ? normalizeDate(data.snapshotDate) : mockValuationSnapshots[index].snapshotDate,
    };

    return mockValuationSnapshots[index];
  }

  async delete(id: string): Promise<void> {
    mockValuationSnapshots = mockValuationSnapshots.filter((snapshot) => snapshot.id !== Number(id));
  }
}