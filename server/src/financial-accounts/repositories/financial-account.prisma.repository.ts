import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FinancialAccountRecord } from '../financial-account.types';
import { PrismaService } from '../../database/prisma.service';
import { CreateFinancialAccountDto } from '../dto/create-financial-account.dto';
import { UpdateFinancialAccountDto } from '../dto/update-financial-account.dto';
import { IFinancialAccountDataSourcePort } from './financial-account.datasource.port';

const normalizeDecimal = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? undefined : new Prisma.Decimal(value);

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const casted = Number(value);
  return Number.isFinite(casted) ? casted : 0;
};

type PrismaFinancialAccountRow = Omit<FinancialAccountRecord, 'openingBalance'> & {
  openingBalance: Prisma.Decimal | number;
};

const mapAccountOutput = (account: PrismaFinancialAccountRow): FinancialAccountRecord => ({
  ...account,
  openingBalance: toNumber(account.openingBalance),
});

@Injectable()
export class FinancialAccountPrismaRepository implements IFinancialAccountDataSourcePort {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord> {
    const account = await this.prisma.financialAccount.create({
      data: {
        ...data,
        openingBalance: normalizeDecimal(data.openingBalance),
        userId: Number(userId),
      },
    });
    return mapAccountOutput(account);
  }

  async findAll(userId: string): Promise<FinancialAccountRecord[]> {
    const accounts = await this.prisma.financialAccount.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map(mapAccountOutput);
  }

  async findOne(id: string, userId: string): Promise<FinancialAccountRecord | null> {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });
    return account ? mapAccountOutput(account) : null;
  }

  async update(id: string, data: UpdateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord | null> {
    const existing = await this.prisma.financialAccount.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });

    if (!existing) return null;

    const account = await this.prisma.financialAccount.update({
      where: { id: Number(id) },
      data,
    });
    return mapAccountOutput(account);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.financialAccount.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });

    if (!existing) return;

    await this.prisma.financialAccount.delete({
      where: { id: Number(id) },
    });
  }

  async sumTransactionFlows(accountIds: number[]): Promise<Map<number, { incoming: number; outgoing: number }>> {
    const flows = new Map<number, { incoming: number; outgoing: number }>();
    if (accountIds.length === 0) return flows;

    const [incomingGroups, outgoingGroups] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['destinationAccountId'],
        where: {
          destinationAccountId: { in: accountIds },
          type: { in: ['INCOME', 'TRANSFER', 'INVESTMENT'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['sourceAccountId'],
        where: {
          sourceAccountId: { in: accountIds },
          type: { in: ['EXPENSE', 'TRANSFER', 'INVESTMENT'] },
        },
        _sum: { amount: true },
      }),
    ]);

    for (const accountId of accountIds) {
      flows.set(accountId, { incoming: 0, outgoing: 0 });
    }
    for (const group of incomingGroups) {
      if (group.destinationAccountId == null) continue;
      flows.get(group.destinationAccountId)!.incoming = group._sum.amount ?? 0;
    }
    for (const group of outgoingGroups) {
      if (group.sourceAccountId == null) continue;
      flows.get(group.sourceAccountId)!.outgoing = group._sum.amount ?? 0;
    }

    return flows;
  }
}