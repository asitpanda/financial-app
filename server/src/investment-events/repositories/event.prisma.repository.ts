import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IEventDataSourcePort } from './event.datasource.port';

const normalizeDate = (value?: string | Date | null) => (value ? new Date(value) : null);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const normalizeDecimal = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : new Prisma.Decimal(value);

@Injectable()
export class EventPrismaRepository implements IEventDataSourcePort {
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<any> {
    return this.prisma.investmentEvent.create({
      data: {
        ...data,
        investmentId: Number(data.investmentId),
        recurringPlanId: normalizeNullableNumber(data.recurringPlanId),
        sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
        linkedTransactionId: normalizeNullableNumber(data.linkedTransactionId),
        dueDate: normalizeDate(data.dueDate),
        status: data.status,
        eventSource: data.eventSource,
        sequenceNumber: normalizeNullableNumber(data.sequenceNumber),
        eventDate: new Date(data.eventDate),
        amount: normalizeDecimal(data.amount),
        pricePerUnit: normalizeDecimal(data.pricePerUnit),
        netAmount: normalizeDecimal(data.netAmount),
      },
    });
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return this.prisma.investmentEvent.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: { eventDate: 'desc' },
    });
  }

  async findOne(id: string): Promise<any> {
    return this.prisma.investmentEvent.findUnique({
      where: { id: Number(id) },
    });
  }

  async update(id: string, data: any): Promise<any> {
    return this.prisma.investmentEvent.update({
      where: { id: Number(id) },
      data: {
        ...data,
        investmentId: data.investmentId !== undefined ? Number(data.investmentId) : undefined,
        recurringPlanId: data.recurringPlanId !== undefined ? normalizeNullableNumber(data.recurringPlanId) : undefined,
        sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : undefined,
        linkedTransactionId: data.linkedTransactionId !== undefined ? normalizeNullableNumber(data.linkedTransactionId) : undefined,
        dueDate: data.dueDate !== undefined ? normalizeDate(data.dueDate) : undefined,
        status: data.status,
        eventSource: data.eventSource,
        sequenceNumber: data.sequenceNumber !== undefined ? normalizeNullableNumber(data.sequenceNumber) : undefined,
        eventDate: data.eventDate !== undefined ? normalizeDate(data.eventDate) : undefined,
        amount: data.amount !== undefined ? normalizeDecimal(data.amount) : undefined,
        pricePerUnit: data.pricePerUnit !== undefined ? normalizeDecimal(data.pricePerUnit) : undefined,
        netAmount: data.netAmount !== undefined ? normalizeDecimal(data.netAmount) : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.investmentEvent.delete({
      where: { id: Number(id) },
    });
  }
}
