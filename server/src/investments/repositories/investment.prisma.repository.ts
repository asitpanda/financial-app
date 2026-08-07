import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IInvestmentDataSourcePort } from './investment.datasource.port';

const normalizeDate = (value?: string | Date | null) => (value ? new Date(value) : null);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class InvestmentPrismaRepository implements IInvestmentDataSourcePort {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: number): Promise<any> {
    return this.prisma.investment.create({
      data: {
        ...data,
        userId,
        accountId: normalizeNullableNumber(data.accountId),
        assetTaxonomyId: normalizeNullableNumber(data.assetTaxonomyId),
        startDate: normalizeDate(data.startDate),
        maturityDate: normalizeDate(data.maturityDate),
        lastValuationAt: normalizeDate(data.lastValuationAt),
      },
    });
  }

  async findAll(userId: number): Promise<any[]> {
    return this.prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.prisma.investment.findFirst({
      where: { id, userId },
    });
  }

  async findById(id: number): Promise<any> {
    return this.prisma.investment.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    const existing = await this.prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    return this.prisma.investment.update({
      where: { id },
      data: {
        ...data,
        accountId: data.accountId !== undefined ? normalizeNullableNumber(data.accountId) : undefined,
        assetTaxonomyId: data.assetTaxonomyId !== undefined ? normalizeNullableNumber(data.assetTaxonomyId) : undefined,
        startDate: data.startDate !== undefined ? normalizeDate(data.startDate) : undefined,
        maturityDate: data.maturityDate !== undefined ? normalizeDate(data.maturityDate) : undefined,
        lastValuationAt: data.lastValuationAt !== undefined ? normalizeDate(data.lastValuationAt) : undefined,
      },
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    const existing = await this.prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!existing) return;

    await this.prisma.investment.delete({
      where: { id },
    });
  }
}