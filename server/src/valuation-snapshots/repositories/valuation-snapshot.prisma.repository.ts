import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ValuationSnapshotRecord } from '../valuation-snapshot.types';
import { CreateValuationSnapshotDto } from '../dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from '../dto/update-valuation-snapshot.dto';
import { IValuationSnapshotDataSourcePort } from './valuation-snapshot.datasource.port';
import { parseRequiredDateInput } from '../../common/utils/date-input';
import { syncInvestmentDerivedValues } from '../../investments/repositories/investment-valuation';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class ValuationSnapshotPrismaRepository
  implements IValuationSnapshotDataSourcePort
{
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number): Promise<ValuationSnapshotRecord[]> {
    return this.prisma.valuationSnapshot.findMany({
      where: { userId },
      orderBy: [{ snapshotDate: 'desc' }, { id: 'desc' }],
    });
  }

  async create(data: CreateValuationSnapshotDto): Promise<ValuationSnapshotRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const snapshot = await transaction.valuationSnapshot.create({
        data: {
          ...data,
          userId: Number(data.userId),
          investmentId: Number(data.investmentId),
          snapshotDate: parseRequiredDateInput(data.snapshotDate, 'snapshotDate'),
          units: normalizeNullableNumber(data.units),
          price: normalizeNullableNumber(data.price),
        },
      });
      await syncInvestmentDerivedValues(transaction, snapshot.investmentId, false);
      return snapshot;
    }, { isolationLevel: 'Serializable' });
  }

  async findAllByInvestment(investmentId: string): Promise<ValuationSnapshotRecord[]> {
    return this.prisma.valuationSnapshot.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: { snapshotDate: 'desc' },
    });
  }

  async findOne(id: string): Promise<ValuationSnapshotRecord | null> {
    return this.prisma.valuationSnapshot.findUnique({
      where: { id: Number(id) },
    });
  }

  async update(id: string, data: UpdateValuationSnapshotDto): Promise<ValuationSnapshotRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.valuationSnapshot.findUnique({ where: { id: Number(id) } });
      if (!existing) return null;
      const snapshot = await transaction.valuationSnapshot.update({
        where: { id: Number(id) },
        data: {
          ...data,
          userId: data.userId !== undefined ? Number(data.userId) : undefined,
          investmentId: data.investmentId !== undefined ? Number(data.investmentId) : undefined,
          snapshotDate: data.snapshotDate !== undefined ? parseRequiredDateInput(data.snapshotDate, 'snapshotDate') : undefined,
          units: data.units !== undefined ? normalizeNullableNumber(data.units) : undefined,
          price: data.price !== undefined ? normalizeNullableNumber(data.price) : undefined,
        },
      });
      for (const investmentId of new Set([existing.investmentId, snapshot.investmentId])) {
        await syncInvestmentDerivedValues(transaction, investmentId, false);
      }
      return snapshot;
    }, { isolationLevel: 'Serializable' });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const snapshot = await transaction.valuationSnapshot.delete({
        where: { id: Number(id) },
      });
      await syncInvestmentDerivedValues(transaction, snapshot.investmentId, false);
    }, { isolationLevel: 'Serializable' });
  }
}