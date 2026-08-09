import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { InvestmentRecord } from '../investment.types';
import { CreateInvestmentDto } from '../dto/create-investment.dto';
import { UpdateInvestmentDto } from '../dto/update-investment.dto';
import { IInvestmentDataSourcePort } from './investment.datasource.port';
import { parseOptionalDateInput } from '../../common/utils/date-input';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

type PrismaInvestmentRow = Omit<InvestmentRecord, 'documentsMeta'> & {
  documentsMeta: Prisma.JsonValue | null;
};

const normalizeDocumentsMeta = (
  value: Prisma.JsonValue | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toPrismaDocumentsMeta = (
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
};

const mapInvestmentOutput = (investment: PrismaInvestmentRow): InvestmentRecord => ({
  ...investment,
  documentsMeta: normalizeDocumentsMeta(investment.documentsMeta),
});

@Injectable()
export class InvestmentPrismaRepository implements IInvestmentDataSourcePort {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateInvestmentDto, userId: number): Promise<InvestmentRecord> {
    const createData: Prisma.InvestmentUncheckedCreateInput = {
      ...data,
      userId,
      accountId: normalizeNullableNumber(data.accountId),
      assetTaxonomyId: normalizeNullableNumber(data.assetTaxonomyId),
      documentsMeta: toPrismaDocumentsMeta(data.documentsMeta),
      startDate: parseOptionalDateInput(data.startDate, 'startDate'),
      maturityDate: parseOptionalDateInput(data.maturityDate, 'maturityDate'),
      lastValuationAt: parseOptionalDateInput(data.lastValuationAt, 'lastValuationAt'),
    };

    const investment = await this.prisma.investment.create({
      data: createData,
    });

    return mapInvestmentOutput(investment);
  }

  async findAll(userId: number): Promise<InvestmentRecord[]> {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return investments.map(mapInvestmentOutput);
  }

  async findOne(id: number, userId: number): Promise<InvestmentRecord | null> {
    const investment = await this.prisma.investment.findFirst({
      where: { id, userId },
    });

    return investment ? mapInvestmentOutput(investment) : null;
  }

  async findById(id: number): Promise<InvestmentRecord | null> {
    const investment = await this.prisma.investment.findUnique({
      where: { id },
    });

    return investment ? mapInvestmentOutput(investment) : null;
  }

  async update(id: number, data: UpdateInvestmentDto, userId: number): Promise<InvestmentRecord | null> {
    const existing = await this.prisma.investment.findFirst({
      where: { id, userId },
    });

    if (!existing) return null;

    const updateData: Prisma.InvestmentUncheckedUpdateInput = {
      ...data,
      accountId: data.accountId !== undefined ? normalizeNullableNumber(data.accountId) : undefined,
      assetTaxonomyId: data.assetTaxonomyId !== undefined ? normalizeNullableNumber(data.assetTaxonomyId) : undefined,
      documentsMeta: data.documentsMeta !== undefined ? toPrismaDocumentsMeta(data.documentsMeta) : undefined,
      startDate: data.startDate !== undefined ? parseOptionalDateInput(data.startDate, 'startDate') : undefined,
      maturityDate: data.maturityDate !== undefined ? parseOptionalDateInput(data.maturityDate, 'maturityDate') : undefined,
      lastValuationAt: data.lastValuationAt !== undefined ? parseOptionalDateInput(data.lastValuationAt, 'lastValuationAt') : undefined,
    };

    const investment = await this.prisma.investment.update({
      where: { id },
      data: updateData,
    });

    return mapInvestmentOutput(investment);
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