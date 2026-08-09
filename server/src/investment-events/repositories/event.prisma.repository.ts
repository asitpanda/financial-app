import { Injectable } from '@nestjs/common';
import { InvestmentEventSource, InvestmentEventStatus, InvestmentEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { InvestmentEventRecord } from '../investment-event.types';
import { CreateInvestmentEventDto } from '../dto/create-investment-event.dto';
import { UpdateInvestmentEventDto } from '../dto/update-investment-event.dto';
import { IEventDataSourcePort } from './event.datasource.port';
import { parseOptionalDateInput, parseRequiredDateInput } from '../../common/utils/date-input';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const normalizeDecimal = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : new Prisma.Decimal(value);
const normalizeNullableFloat = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

type PrismaInvestmentEventRow = {
  id: number;
  investmentId: number;
  recurringPlanId: number | null;
  sourceAccountId: number | null;
  linkedTransactionId: number | null;
  eventType: InvestmentEventType;
  dueDate: Date | null;
  status: InvestmentEventRecord['status'];
  eventSource: InvestmentEventRecord['eventSource'];
  sequenceNumber: number | null;
  eventDate: Date;
  amount: Prisma.Decimal | null;
  units: number | null;
  pricePerUnit: Prisma.Decimal | null;
  netAmount: Prisma.Decimal | null;
  notes: string | null;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeMeta = (value: Prisma.JsonValue | Record<string, unknown> | null | undefined) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toPrismaMeta = (
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const casted = Number(value);
  return Number.isFinite(casted) ? casted : null;
};

const mapEventOutput = (event: PrismaInvestmentEventRow): InvestmentEventRecord => ({
  ...event,
  amount: toNumber(event.amount),
  units: toNumber(event.units),
  pricePerUnit: toNumber(event.pricePerUnit),
  netAmount: toNumber(event.netAmount),
  meta: normalizeMeta(event.meta),
});

@Injectable()
export class EventPrismaRepository implements IEventDataSourcePort {
  constructor(private prisma: PrismaService) {}

  private async syncInvestmentDerivedValues(
    tx: Prisma.TransactionClient,
    investmentId: number,
  ) {
    const [contributionAgg, withdrawalAgg] =
      await Promise.all([
        tx.investmentEvent.aggregate({
          where: {
            investmentId,
            status: 'CONFIRMED',
            eventType: { in: [InvestmentEventType.CONTRIBUTION, InvestmentEventType.OPENING_BALANCE] },
          },
          _sum: { amount: true },
        }),
        tx.investmentEvent.aggregate({
          where: {
            investmentId,
            status: 'CONFIRMED',
            eventType: { in: [InvestmentEventType.WITHDRAWAL_PRINCIPAL] },
          },
          _sum: { amount: true },
        }),
      ]);

    const contributionTotal = contributionAgg._sum.amount?.toNumber() ?? 0;
    const withdrawalTotal = withdrawalAgg._sum.amount?.toNumber() ?? 0;
    const principalTotal = contributionTotal - withdrawalTotal;

    await tx.investment.update({
      where: { id: investmentId },
      data: {
        totalInvested: principalTotal,
      },
    });
  }

  async create(data: CreateInvestmentEventDto): Promise<InvestmentEventRecord> {
    return this.prisma.$transaction(async (tx) => {
      const createData: Prisma.InvestmentEventUncheckedCreateInput = {
        ...data,
        investmentId: Number(data.investmentId),
        recurringPlanId: normalizeNullableNumber(data.recurringPlanId),
        sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
        linkedTransactionId: normalizeNullableNumber(data.linkedTransactionId),
        eventType: data.eventType,
        dueDate: parseOptionalDateInput(data.dueDate, 'dueDate'),
        status: data.status as InvestmentEventStatus | undefined,
        eventSource: data.eventSource as InvestmentEventSource | undefined,
        sequenceNumber: normalizeNullableNumber(data.sequenceNumber),
        eventDate: parseRequiredDateInput(data.eventDate, 'eventDate'),
        amount: normalizeDecimal(data.amount),
        units: normalizeNullableFloat(data.units),
        pricePerUnit: normalizeDecimal(data.pricePerUnit),
        netAmount: normalizeDecimal(data.netAmount),
        meta: toPrismaMeta(data.meta),
      };

      const created = await tx.investmentEvent.create({
        data: createData,
      });

      await this.syncInvestmentDerivedValues(tx, created.investmentId);
      return mapEventOutput(created);
    });
  }

  async findAll(userId: number): Promise<InvestmentEventRecord[]> {
    const events = await this.prisma.investmentEvent.findMany({
      where: {
        investment: {
          userId,
        },
      },
      orderBy: [{ eventDate: 'desc' }, { id: 'desc' }],
    });

    return events.map(mapEventOutput);
  }

  async findAllByInvestment(investmentId: string): Promise<InvestmentEventRecord[]> {
    const events = await this.prisma.investmentEvent.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: { eventDate: 'desc' },
    });

    return events.map(mapEventOutput);
  }

  async findOne(id: string): Promise<InvestmentEventRecord | null> {
    const event = await this.prisma.investmentEvent.findUnique({
      where: { id: Number(id) },
    });

    return event ? mapEventOutput(event) : null;
  }

  async update(id: string, data: UpdateInvestmentEventDto): Promise<InvestmentEventRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.investmentEvent.findUnique({
        where: { id: Number(id) },
      });

      const updateData: Prisma.InvestmentEventUncheckedUpdateInput = {
        ...data,
        investmentId: data.investmentId !== undefined ? Number(data.investmentId) : undefined,
        recurringPlanId: data.recurringPlanId !== undefined ? normalizeNullableNumber(data.recurringPlanId) : undefined,
        sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : undefined,
        linkedTransactionId: data.linkedTransactionId !== undefined ? normalizeNullableNumber(data.linkedTransactionId) : undefined,
        eventType: data.eventType !== undefined ? data.eventType : undefined,
        dueDate: data.dueDate !== undefined ? parseOptionalDateInput(data.dueDate, 'dueDate') : undefined,
        status: data.status as InvestmentEventStatus | undefined,
        eventSource: data.eventSource as InvestmentEventSource | undefined,
        sequenceNumber: data.sequenceNumber !== undefined ? normalizeNullableNumber(data.sequenceNumber) : undefined,
        eventDate: data.eventDate !== undefined ? parseRequiredDateInput(data.eventDate, 'eventDate') : undefined,
        amount: data.amount !== undefined ? normalizeDecimal(data.amount) : undefined,
        units: data.units !== undefined ? normalizeNullableFloat(data.units) : undefined,
        pricePerUnit: data.pricePerUnit !== undefined ? normalizeDecimal(data.pricePerUnit) : undefined,
        netAmount: data.netAmount !== undefined ? normalizeDecimal(data.netAmount) : undefined,
        meta: data.meta !== undefined ? toPrismaMeta(data.meta) : undefined,
      };

      const updated = await tx.investmentEvent.update({
        where: { id: Number(id) },
        data: updateData,
      });

      const investmentIds = new Set<number>();
      if (existing?.investmentId) investmentIds.add(existing.investmentId);
      if (updated.investmentId) investmentIds.add(updated.investmentId);

      for (const investmentId of investmentIds) {
        await this.syncInvestmentDerivedValues(tx, investmentId);
      }

      return mapEventOutput(updated);
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.investmentEvent.findUnique({
        where: { id: Number(id) },
      });

      await tx.investmentEvent.delete({
        where: { id: Number(id) },
      });

      if (existing?.investmentId) {
        await this.syncInvestmentDerivedValues(tx, existing.investmentId);
      }
    });
  }
}
