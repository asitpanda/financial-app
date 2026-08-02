import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IValuationSnapshotDataSourcePort } from './valuation-snapshot.datasource.port';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class ValuationSnapshotPrismaRepository
  implements IValuationSnapshotDataSourcePort
{
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<any> {
    return this.prisma.valuationSnapshot.create({
      data: {
        ...data,
        userId: Number(data.userId),
        investmentId: Number(data.investmentId),
        snapshotDate: new Date(data.snapshotDate),
        units: normalizeNullableNumber(data.units),
        price: normalizeNullableNumber(data.price),
      },
    });
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return this.prisma.valuationSnapshot.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: { snapshotDate: 'desc' },
    });
  }

  async findOne(id: string): Promise<any> {
    return this.prisma.valuationSnapshot.findUnique({
      where: { id: Number(id) },
    });
  }

  async update(id: string, data: any): Promise<any> {
    return this.prisma.valuationSnapshot.update({
      where: { id: Number(id) },
      data: {
        ...data,
        userId: data.userId !== undefined ? Number(data.userId) : undefined,
        investmentId: data.investmentId !== undefined ? Number(data.investmentId) : undefined,
        snapshotDate: data.snapshotDate !== undefined ? new Date(data.snapshotDate) : undefined,
        units: data.units !== undefined ? normalizeNullableNumber(data.units) : undefined,
        price: data.price !== undefined ? normalizeNullableNumber(data.price) : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.valuationSnapshot.delete({
      where: { id: Number(id) },
    });
  }
}