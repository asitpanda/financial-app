import { Injectable } from '@nestjs/common';
import { InvestmentBenefitStatus, InvestmentBenefitType, InvestmentEventSource, InvestmentEventStatus, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { parseRequiredDateInput } from '../../common/utils/date-input';
import type { CreateInvestmentBenefitDto } from '../dto/create-investment-benefit.dto';
import type { UpdateInvestmentBenefitDto } from '../dto/update-investment-benefit.dto';
import type { InvestmentBenefitDetailRecord, InvestmentBenefitRecord } from '../investment-benefit.types';
import type { InvestmentEventRecord } from '../../investment-events/investment-event.types';
import type { QuickRealizeInvestmentBenefitDto, RealizeInvestmentBenefitDto } from '../dto/realize-investment-benefit.dto';
import type { IBenefitDataSourcePort } from './benefit.datasource.port';

type PrismaBenefitRow = {
  id: number;
  investmentId: number;
  benefitType: InvestmentBenefitType;
  amount: Prisma.Decimal;
  benefitDate: Date;
  status: InvestmentBenefitStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const mapBenefit = (benefit: PrismaBenefitRow): InvestmentBenefitRecord => ({
  ...benefit,
  amount: benefit.amount.toNumber(),
});

const mapEvent = (event: any): InvestmentEventRecord => ({
  ...event,
  amount: event.amount?.toNumber?.() ?? event.amount ?? null,
  units: event.units ?? null,
  pricePerUnit: event.pricePerUnit?.toNumber?.() ?? event.pricePerUnit ?? null,
  netAmount: event.netAmount?.toNumber?.() ?? event.netAmount ?? null,
  meta: event.meta && typeof event.meta === 'object' && !Array.isArray(event.meta) ? event.meta : null,
});

@Injectable()
export class BenefitPrismaRepository implements IBenefitDataSourcePort {
  constructor(private readonly prisma: PrismaService) {}

  async create(investmentId: string, data: CreateInvestmentBenefitDto): Promise<InvestmentBenefitRecord> {
    const benefit = await this.prisma.investmentBenefit.create({
      data: {
        investmentId: Number(investmentId),
        benefitType: data.benefitType,
        amount: new Prisma.Decimal(data.amount),
        benefitDate: parseRequiredDateInput(data.benefitDate, 'benefitDate'),
        notes: data.notes,
      },
    });

    return mapBenefit(benefit);
  }

  async findAll(userId: number): Promise<InvestmentBenefitRecord[]> {
    const benefits = await this.prisma.investmentBenefit.findMany({
      where: { investment: { userId } },
      orderBy: [{ benefitDate: 'asc' }, { id: 'asc' }],
    });
    return benefits.map(mapBenefit);
  }

  async findAllByInvestment(investmentId: string): Promise<InvestmentBenefitRecord[]> {
    const benefits = await this.prisma.investmentBenefit.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: [{ benefitDate: 'asc' }, { id: 'asc' }],
    });
    return benefits.map(mapBenefit);
  }

  async findAllByInvestmentWithDetails(investmentId: string): Promise<InvestmentBenefitDetailRecord[]> {
    const benefits = await this.prisma.investmentBenefit.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: [{ benefitDate: 'asc' }, { id: 'asc' }],
    });
    const events = await this.prisma.investmentEvent.findMany({
      where: {
        investmentId: Number(investmentId),
        linkedBenefitId: { in: benefits.map((benefit) => benefit.id) },
      },
      orderBy: { eventDate: 'asc' },
    });
    const eventsByBenefitId = new Map<number, InvestmentEventRecord[]>();
    for (const event of events) {
      const mappedEvent = mapEvent(event);
      const benefitEvents = eventsByBenefitId.get(event.linkedBenefitId!) ?? [];
      benefitEvents.push(mappedEvent);
      eventsByBenefitId.set(event.linkedBenefitId!, benefitEvents);
    }
    return benefits.map((benefit) => ({
      ...mapBenefit(benefit),
      realizedEvents: eventsByBenefitId.get(benefit.id) ?? [],
    }));
  }

  async findOne(id: string): Promise<InvestmentBenefitRecord | null> {
    const benefit = await this.prisma.investmentBenefit.findUnique({ where: { id: Number(id) } });
    return benefit ? mapBenefit(benefit) : null;
  }

  async findOneWithDetails(id: string): Promise<InvestmentBenefitDetailRecord | null> {
    const benefit = await this.prisma.investmentBenefit.findUnique({
      where: { id: Number(id) },
    });
    if (!benefit) return null;

    const events = await this.prisma.investmentEvent.findMany({
      where: { linkedBenefitId: benefit.id },
      orderBy: { eventDate: 'asc' },
    });
    return {
      ...mapBenefit(benefit),
      realizedEvents: events.map(mapEvent),
    };
  }

  async update(id: string, data: UpdateInvestmentBenefitDto): Promise<InvestmentBenefitRecord | null> {
    try {
      const benefit = await this.prisma.investmentBenefit.update({
        where: { id: Number(id) },
        data: {
          benefitType: data.benefitType,
          amount: data.amount === undefined ? undefined : new Prisma.Decimal(data.amount),
          benefitDate: data.benefitDate === undefined ? undefined : parseRequiredDateInput(data.benefitDate, 'benefitDate'),
          status: data.status,
          notes: data.notes,
        },
      });
      return mapBenefit(benefit);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return null;
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.investmentBenefit.delete({ where: { id: Number(id) } });
  }

  async realize(id: string, investmentId: string, userId: number, data: RealizeInvestmentBenefitDto) {
    return this.prisma.$transaction(async (tx) => {
      const benefit = await tx.investmentBenefit.findFirst({
        where: { id: Number(id), investmentId: Number(investmentId), investment: { userId } },
      });
      if (!benefit) throw new Error('Investment benefit not found');
      if (benefit.status !== InvestmentBenefitStatus.EXPECTED) throw new Error('Investment benefit was already realized');

      const events = [] as InvestmentEventRecord[];
      for (const component of data.components) {
        let linkedTransactionId: number | null = null;
        if (component.transaction) {
          const transaction = component.transaction;
          const createdTransaction = await tx.transaction.create({
            data: {
              userId,
              type: transaction.type ?? TransactionType.INVESTMENT,
              amount: component.amount,
              sourceAccountId: transaction.sourceAccountId ?? null,
              destinationAccountId: transaction.destinationAccountId ?? null,
              categoryId: transaction.categoryId ?? null,
              goalId: transaction.goalId ?? null,
              notes: transaction.notes ?? component.notes ?? null,
              date: component.eventDate ? new Date(component.eventDate) : new Date(),
            },
          });
          linkedTransactionId = createdTransaction.id;
        }

        const event = await tx.investmentEvent.create({
          data: {
            investmentId: Number(investmentId),
            recurringPlanId: null,
            linkedTransactionId,
            linkedBenefitId: benefit.id,
            eventType: component.eventType,
            dueDate: null,
            status: InvestmentEventStatus.CONFIRMED,
            eventSource: InvestmentEventSource.MANUAL,
            sequenceNumber: null,
            eventDate: component.eventDate ? new Date(component.eventDate) : new Date(),
            amount: new Prisma.Decimal(component.amount),
            units: null,
            pricePerUnit: null,
            netAmount: null,
            notes: component.notes ?? null,
            meta: Prisma.JsonNull,
          },
        });
        events.push(mapEvent(event));
      }

      const updatedBenefit = await tx.investmentBenefit.update({
        where: { id: benefit.id },
        data: { status: InvestmentBenefitStatus.RECEIVED },
      });
      if (data.closesInvestment) {
        await tx.investment.update({
          where: { id: benefit.investmentId },
          data: { status: benefit.benefitType === InvestmentBenefitType.MATURITY ? 'matured' : 'closed' },
        });
      }
      return { benefit: mapBenefit(updatedBenefit), events };
    });
  }

  async quickRealize(investmentId: string, userId: number, data: QuickRealizeInvestmentBenefitDto) {
    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findFirst({ where: { id: Number(investmentId), userId } });
      if (!investment) throw new Error('Investment not found');
      const benefit = await tx.investmentBenefit.create({
        data: {
          investmentId: Number(investmentId),
          benefitType: data.benefitType,
          amount: new Prisma.Decimal(data.amount),
          benefitDate: data.benefitDate ? parseRequiredDateInput(data.benefitDate, 'benefitDate') : new Date(),
          notes: data.benefitNotes,
          status: InvestmentBenefitStatus.EXPECTED,
        },
      });
      const result = await this.realizeInTransaction(tx, benefit, userId, data);
      return result;
    });
  }

  private async realizeInTransaction(tx: Prisma.TransactionClient, benefit: any, userId: number, data: QuickRealizeInvestmentBenefitDto) {
    const transaction = data.transaction
      ? await tx.transaction.create({
          data: {
            userId,
            type: data.transaction.type ?? TransactionType.INVESTMENT,
            amount: data.amount,
            sourceAccountId: data.transaction.sourceAccountId ?? null,
            destinationAccountId: data.transaction.destinationAccountId ?? null,
            categoryId: data.transaction.categoryId ?? null,
            goalId: data.transaction.goalId ?? null,
            notes: data.transaction.notes ?? data.notes ?? null,
            date: data.eventDate ? new Date(data.eventDate) : new Date(),
          },
        })
      : null;
    const event = await tx.investmentEvent.create({
      data: {
        investmentId: benefit.investmentId,
        linkedTransactionId: transaction?.id ?? null,
        linkedBenefitId: benefit.id,
        eventType: data.eventType,
        status: InvestmentEventStatus.CONFIRMED,
        eventSource: InvestmentEventSource.MANUAL,
        eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
        amount: new Prisma.Decimal(data.amount),
      },
    });
    const updatedBenefit = await tx.investmentBenefit.update({
      where: { id: benefit.id },
      data: { status: InvestmentBenefitStatus.RECEIVED },
    });
    if (data.closesInvestment) {
      await tx.investment.update({
        where: { id: benefit.investmentId },
        data: { status: benefit.benefitType === InvestmentBenefitType.MATURITY ? 'matured' : 'closed' },
      });
    }
    return { benefit: mapBenefit(updatedBenefit), events: [mapEvent(event)] };
  }
}