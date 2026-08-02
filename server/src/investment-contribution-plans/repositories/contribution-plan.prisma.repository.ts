import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IContributionPlanDataSourcePort } from './contribution-plan.datasource.port';

const normalizeDate = (value?: string | Date | null) => (value ? new Date(value) : null);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const normalizeDecimal = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : new Prisma.Decimal(value);

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const casted = Number(value);
  return Number.isFinite(casted) ? casted : null;
};

const mapPlanOutput = (plan: any) => ({
  ...plan,
  amount: toNumber(plan.amount),
});

@Injectable()
export class ContributionPlanPrismaRepository
  implements IContributionPlanDataSourcePort
{
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<any> {
    const created = await this.prisma.investmentContributionPlan.create({
      data: {
        ...data,
        investmentId: Number(data.investmentId),
        sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
        reminderDaysBefore: normalizeNullableNumber(data.reminderDaysBefore),
        amount: normalizeDecimal(data.amount),
        historicalImportMode: data.historicalImportMode,
        anchorDate: new Date(data.anchorDate),
        lastGeneratedDueDate: normalizeDate(data.lastGeneratedDueDate),
        nextDueDate: normalizeDate(data.nextDueDate),
        endDate: normalizeDate(data.endDate),
      },
    });

    return mapPlanOutput(created);
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    const plans = await this.prisma.investmentContributionPlan.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: { nextDueDate: 'asc' },
    });

    return plans.map(mapPlanOutput);
  }

  async findOne(id: string): Promise<any> {
    const plan = await this.prisma.investmentContributionPlan.findUnique({
      where: { id: Number(id) },
    });

    return plan ? mapPlanOutput(plan) : null;
  }

  async update(id: string, data: any): Promise<any> {
    const updated = await this.prisma.investmentContributionPlan.update({
      where: { id: Number(id) },
      data: {
        ...data,
        investmentId: data.investmentId !== undefined ? Number(data.investmentId) : undefined,
        sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : undefined,
        reminderDaysBefore:
          data.reminderDaysBefore !== undefined ? normalizeNullableNumber(data.reminderDaysBefore) : undefined,
        amount: data.amount !== undefined ? normalizeDecimal(data.amount) : undefined,
        historicalImportMode: data.historicalImportMode,
        anchorDate: data.anchorDate !== undefined ? new Date(data.anchorDate) : undefined,
        lastGeneratedDueDate:
          data.lastGeneratedDueDate !== undefined ? normalizeDate(data.lastGeneratedDueDate) : undefined,
        nextDueDate: data.nextDueDate !== undefined ? normalizeDate(data.nextDueDate) : undefined,
        endDate: data.endDate !== undefined ? normalizeDate(data.endDate) : undefined,
      },
    });

    return mapPlanOutput(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.investmentContributionPlan.delete({
      where: { id: Number(id) },
    });
  }

  async findActiveByInvestment(investmentId: string): Promise<any | null> {
    const activePlan = await this.prisma.investmentContributionPlan.findFirst({
      where: {
        investmentId: Number(investmentId),
        status: 'active',
      },
      orderBy: { updatedAt: 'desc' },
    });

    return activePlan ? mapPlanOutput(activePlan) : null;
  }

  async createPlanWithHistoricalEvents(data: {
    investmentId: string;
    userId: number;
    planPayload: any;
    selectedHistoricalItems: any[];
  }): Promise<any> {
    const { investmentId, userId, planPayload, selectedHistoricalItems } = data;
    const investmentIdNum = Number(investmentId);
    const sourceAccountId = normalizeNullableNumber(planPayload.sourceAccountId);

    return this.prisma.$transaction(async (tx) => {
      const investment = await tx.investment.findFirst({
        where: { id: investmentIdNum, userId },
      });

      if (!investment) {
        throw new Error('Investment not found');
      }

      if (sourceAccountId) {
        const account = await tx.financialAccount.findFirst({
          where: { id: sourceAccountId, userId },
        });
        if (!account) {
          throw new Error('Source account not found or ownership mismatch');
        }
      }

      if (String(planPayload.status || '').toLowerCase() === 'active') {
        const existingActive = await tx.investmentContributionPlan.findFirst({
          where: {
            investmentId: investmentIdNum,
            status: 'active',
          },
        });

        if (existingActive) {
          throw new Error('An active recurring plan already exists for this investment');
        }
      }

      const createdPlan = await tx.investmentContributionPlan.create({
        data: {
          investmentId: investmentIdNum,
          sourceAccountId,
          status: planPayload.status || 'active',
          amount: planPayload.amount as unknown as number,
          cadenceUnit: String(planPayload.cadenceUnit),
          cadenceInterval: Number(planPayload.cadenceInterval),
          historicalImportMode: planPayload.historicalImportMode || 'MANUAL_REVIEW',
          anchorDate: new Date(planPayload.anchorDate),
          lastGeneratedDueDate: normalizeDate(planPayload.lastGeneratedDueDate),
          nextDueDate: normalizeDate(planPayload.nextDueDate),
          endDate: normalizeDate(planPayload.endDate),
          reminderDaysBefore: normalizeNullableNumber(planPayload.reminderDaysBefore),
          autoCreateEvent: Boolean(planPayload.autoCreateEvent),
          notes: planPayload.notes || null,
        },
      } as any);

      const persistedEvents: any[] = [];
      let sequenceCounter = 1;

      for (const item of selectedHistoricalItems) {
        if (!item?.selected) continue;

        const dueDate = normalizeDate(item.dueDate);
        const eventType = String(item.eventType || 'CONTRIBUTION');

        if (!dueDate) continue;

        const duplicate = await tx.investmentEvent.findFirst({
          where: {
            recurringPlanId: createdPlan.id,
            dueDate,
            eventType,
          },
        });

        if (duplicate) {
          throw new Error(`Duplicate recurring event for dueDate ${dueDate.toISOString()}`);
        }

        const event = await tx.investmentEvent.create({
          data: {
            investmentId: investmentIdNum,
            recurringPlanId: createdPlan.id,
            sourceAccountId,
            linkedTransactionId: null,
            eventType,
            dueDate,
            status: item.status || 'PENDING',
            eventSource: eventType.startsWith('OPENING_')
              ? 'MANUAL'
              : 'HISTORICAL_IMPORT',
            sequenceNumber: Number(item.sequenceNumber || sequenceCounter),
            eventDate: normalizeDate(item.eventDate) || dueDate,
            amount: (item.amount ?? planPayload.amount) as unknown as number,
            units: item.units !== undefined ? Number(item.units) : null,
            pricePerUnit:
              item.pricePerUnit !== undefined && item.pricePerUnit !== null
                ? (item.pricePerUnit as unknown as number)
                : null,
            netAmount:
              item.netAmount !== undefined && item.netAmount !== null
                ? (item.netAmount as unknown as number)
                : null,
            notes: item.notes || null,
            meta: item.meta || null,
          },
        } as any);

        persistedEvents.push({
          ...event,
          amount: toNumber(event.amount),
          pricePerUnit: toNumber(event.pricePerUnit),
          netAmount: toNumber(event.netAmount),
        });
        sequenceCounter += 1;
      }

      const contributionAgg = await tx.investmentEvent.aggregate({
        where: {
          investmentId: investmentIdNum,
          status: 'CONFIRMED',
          eventType: { in: ['CONTRIBUTION', 'OPENING_BALANCE'] },
        },
        _sum: { amount: true },
      });

      const withdrawalAgg = await tx.investmentEvent.aggregate({
        where: {
          investmentId: investmentIdNum,
          status: 'CONFIRMED',
          eventType: { in: ['WITHDRAWAL_PRINCIPAL'] },
        },
        _sum: { amount: true },
      });

      const contributionTotal = toNumber(contributionAgg._sum.amount) ?? 0;
      const withdrawalTotal = toNumber(withdrawalAgg._sum.amount) ?? 0;
      const principalTotal = contributionTotal - withdrawalTotal;

      await tx.investment.update({
        where: { id: investmentIdNum },
        data: {
          totalInvested: principalTotal,
        },
      });

      return {
        plan: mapPlanOutput(createdPlan),
        historicalEvents: persistedEvents,
      };
    });
  }

  async generateDueRecurringInvestmentEvents(data: {
    cutoffDate: Date;
    limit?: number;
  }): Promise<{
    processedPlans: number;
    generatedEvents: number;
  }> {
    const cutoffDate = new Date(data.cutoffDate);
    const limit = data.limit ?? 200;

    const plans = await this.prisma.investmentContributionPlan.findMany({
      where: {
        status: 'active',
        nextDueDate: { lte: cutoffDate },
      },
      orderBy: { nextDueDate: 'asc' },
      take: limit,
    });

    let generatedEvents = 0;

    for (const plan of plans) {
      const startedAt = Date.now();
      let nextDueDate = plan.nextDueDate ? new Date(plan.nextDueDate) : new Date(plan.anchorDate);
      let generatedForPlan = 0;
      let lastGeneratedDueDate: Date | null = null;

      while (nextDueDate && nextDueDate <= cutoffDate) {
        if (plan.endDate && nextDueDate > plan.endDate) break;

        const generatedDueDate = new Date(nextDueDate);

        const duplicate = await this.prisma.investmentEvent.findFirst({
          where: {
            recurringPlanId: plan.id,
            dueDate: nextDueDate,
            eventType: 'CONTRIBUTION',
          },
        });

        if (!duplicate) {
          await this.prisma.investmentEvent.create({
            data: {
              investmentId: plan.investmentId,
              recurringPlanId: plan.id,
              sourceAccountId: plan.sourceAccountId,
              linkedTransactionId: null,
              eventType: 'CONTRIBUTION',
              dueDate: nextDueDate,
              status: 'EXPECTED',
              eventSource: 'SYSTEM_GENERATED',
              sequenceNumber: null,
              eventDate: nextDueDate,
              amount: plan.amount,
            },
          });
          generatedForPlan += 1;
        }

        lastGeneratedDueDate = generatedDueDate;
        nextDueDate = this.advanceByCadence(nextDueDate, plan.cadenceUnit, plan.cadenceInterval, plan.anchorDate);
      }

      await this.prisma.investmentContributionPlan.update({
        where: { id: plan.id },
        data: {
          nextDueDate,
          lastGeneratedDueDate,
        },
      });

      generatedEvents += generatedForPlan;
      const durationMs = Date.now() - startedAt;
      console.log(
        `[RecurringScheduler] planId=${plan.id} generated=${generatedForPlan} nextDueDate=${nextDueDate ? nextDueDate.toISOString() : 'null'} durationMs=${durationMs}`,
      );
    }

    return {
      processedPlans: plans.length,
      generatedEvents,
    };
  }

  private advanceByCadence(current: Date, cadenceUnit: string, cadenceInterval: number, anchorDate: Date): Date {
    const interval = Number(cadenceInterval) > 0 ? Number(cadenceInterval) : 1;
    const anchorDay = anchorDate.getUTCDate();

    if (cadenceUnit === 'day') {
      return new Date(current.getTime() + interval * 24 * 60 * 60 * 1000);
    }

    if (cadenceUnit === 'week') {
      return new Date(current.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    }

    const monthStep =
      cadenceUnit === 'month'
        ? interval
        : cadenceUnit === 'quarter'
          ? interval * 3
          : cadenceUnit === 'year'
            ? interval * 12
            : interval;

    const year = current.getUTCFullYear();
    const month = current.getUTCMonth() + monthStep;

    const targetYear = year + Math.floor(month / 12);
    const targetMonth = ((month % 12) + 12) % 12;
    const maxDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const safeDay = Math.min(anchorDay, maxDay);

    return new Date(Date.UTC(targetYear, targetMonth, safeDay));
  }
}