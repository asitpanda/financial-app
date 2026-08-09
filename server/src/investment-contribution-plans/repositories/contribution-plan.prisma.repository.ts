import { Injectable } from '@nestjs/common';
import { HistoricalImportMode, InvestmentEventStatus, InvestmentEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { InvestmentContributionPlanRecord } from '../investment-contribution-plan.types';
import type { InvestmentEventRecord } from '../../investment-events/investment-event.types';
import {
  ContributionPlanUpdateInput,
  ContributionPlanWriteInput,
  CreatePlanWithHistoricalEventsInput,
  CreatePlanWithHistoricalEventsResult,
  SkipCurrentContributionInput,
  SkipCurrentContributionResult,
} from '../investment-contribution-plan.types';
import type { IContributionPlanDataSourcePort } from './contribution-plan.datasource.port';
import { parseOptionalDateInput, parseRequiredDateInput } from '../../common/utils/date-input';

const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const normalizeDecimal = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : new Prisma.Decimal(value);

type PrismaPlanRow = Omit<InvestmentContributionPlanRecord, 'amount'> & {
  amount: Prisma.Decimal;
};

type PrismaEventRow = {
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

const mapPlanOutput = (plan: PrismaPlanRow): InvestmentContributionPlanRecord => ({
  ...plan,
  amount: toNumber(plan.amount) ?? 0,
});

const mapEventOutput = (event: PrismaEventRow): InvestmentEventRecord => ({
  ...event,
  amount: toNumber(event.amount),
  units: toNumber(event.units),
  pricePerUnit: toNumber(event.pricePerUnit),
  netAmount: toNumber(event.netAmount),
  meta: normalizeMeta(event.meta),
});

@Injectable()
export class ContributionPlanPrismaRepository
  implements IContributionPlanDataSourcePort
{
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

    const contributionTotal = toNumber(contributionAgg._sum.amount) ?? 0;
    const withdrawalTotal = toNumber(withdrawalAgg._sum.amount) ?? 0;
    const principalTotal = contributionTotal - withdrawalTotal;

    await tx.investment.update({
      where: { id: investmentId },
      data: {
        totalInvested: principalTotal,
      },
    });
  }

  async create(data: ContributionPlanWriteInput): Promise<InvestmentContributionPlanRecord> {
    const createData: Prisma.InvestmentContributionPlanUncheckedCreateInput = {
      ...data,
      investmentId: Number(data.investmentId),
      sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
      reminderDaysBefore: normalizeNullableNumber(data.reminderDaysBefore),
      amount: normalizeDecimal(data.amount) ?? undefined,
      historicalImportMode: data.historicalImportMode as HistoricalImportMode | undefined,
      anchorDate: parseRequiredDateInput(data.anchorDate, 'anchorDate'),
      lastGeneratedDueDate: parseOptionalDateInput(data.lastGeneratedDueDate, 'lastGeneratedDueDate'),
      nextDueDate: parseOptionalDateInput(data.nextDueDate, 'nextDueDate'),
      endDate: parseOptionalDateInput(data.endDate, 'endDate'),
    };

    const created = await this.prisma.investmentContributionPlan.create({
      data: createData,
    });

    return mapPlanOutput(created);
  }

  async findAllByInvestment(investmentId: string): Promise<InvestmentContributionPlanRecord[]> {
    const plans = await this.prisma.investmentContributionPlan.findMany({
      where: { investmentId: Number(investmentId) },
      orderBy: { nextDueDate: 'asc' },
    });

    return plans.map(mapPlanOutput);
  }

  async findAllByUser(userId: number): Promise<InvestmentContributionPlanRecord[]> {
    const plans = await this.prisma.investmentContributionPlan.findMany({
      where: {
        investment: {
          userId,
        },
      },
      orderBy: [{ investmentId: 'asc' }, { updatedAt: 'desc' }, { id: 'desc' }],
    });

    return plans.map(mapPlanOutput);
  }

  async findAllActiveByUser(userId: number): Promise<InvestmentContributionPlanRecord[]> {
    const plans = await this.prisma.investmentContributionPlan.findMany({
      where: {
        status: 'active',
        investment: {
          userId,
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    return plans.map(mapPlanOutput);
  }

  async findOne(id: string): Promise<InvestmentContributionPlanRecord | null> {
    const plan = await this.prisma.investmentContributionPlan.findUnique({
      where: { id: Number(id) },
    });

    return plan ? mapPlanOutput(plan) : null;
  }

  async update(
    id: string,
    data: ContributionPlanUpdateInput,
  ): Promise<InvestmentContributionPlanRecord | null> {
    const updateData: Prisma.InvestmentContributionPlanUncheckedUpdateInput = {
      ...data,
      investmentId: data.investmentId !== undefined ? Number(data.investmentId) : undefined,
      sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : undefined,
      reminderDaysBefore:
        data.reminderDaysBefore !== undefined ? normalizeNullableNumber(data.reminderDaysBefore) : undefined,
      amount: data.amount !== undefined ? normalizeDecimal(data.amount) : undefined,
      historicalImportMode: data.historicalImportMode as HistoricalImportMode | undefined,
      anchorDate: data.anchorDate !== undefined ? parseRequiredDateInput(data.anchorDate, 'anchorDate') : undefined,
      lastGeneratedDueDate:
        data.lastGeneratedDueDate !== undefined ? parseOptionalDateInput(data.lastGeneratedDueDate, 'lastGeneratedDueDate') : undefined,
      nextDueDate: data.nextDueDate !== undefined ? parseOptionalDateInput(data.nextDueDate, 'nextDueDate') : undefined,
      endDate: data.endDate !== undefined ? parseOptionalDateInput(data.endDate, 'endDate') : undefined,
    };

    const updated = await this.prisma.investmentContributionPlan.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return mapPlanOutput(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.investmentContributionPlan.delete({
      where: { id: Number(id) },
    });
  }

  async findActiveByInvestment(
    investmentId: string,
  ): Promise<InvestmentContributionPlanRecord | null> {
    const activePlan = await this.prisma.investmentContributionPlan.findFirst({
      where: {
        investmentId: Number(investmentId),
        status: 'active',
      },
      orderBy: { updatedAt: 'desc' },
    });

    return activePlan ? mapPlanOutput(activePlan) : null;
  }

  async createPlanWithHistoricalEvents(
    data: CreatePlanWithHistoricalEventsInput,
  ): Promise<CreatePlanWithHistoricalEventsResult> {
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
          amount: normalizeDecimal(planPayload.amount),
          cadenceUnit: String(planPayload.cadenceUnit),
          cadenceInterval: Number(planPayload.cadenceInterval),
          historicalImportMode:
            (planPayload.historicalImportMode || 'TRACK_FROM_TODAY') as HistoricalImportMode,
          anchorDate: parseRequiredDateInput(planPayload.anchorDate, 'anchorDate'),
          lastGeneratedDueDate: parseOptionalDateInput(planPayload.lastGeneratedDueDate, 'lastGeneratedDueDate'),
          nextDueDate: parseOptionalDateInput(planPayload.nextDueDate, 'nextDueDate'),
          endDate: parseOptionalDateInput(planPayload.endDate, 'endDate'),
          reminderDaysBefore: normalizeNullableNumber(planPayload.reminderDaysBefore),
          autoCreateEvent: Boolean(planPayload.autoCreateEvent),
          notes: planPayload.notes || null,
        },
      });

      const persistedEvents: InvestmentEventRecord[] = [];
      let sequenceCounter = 1;

      for (const item of selectedHistoricalItems) {
        if (!item?.selected) continue;

        const dueDate = parseOptionalDateInput(item.dueDate, 'dueDate');
        const eventType = item.eventType || InvestmentEventType.CONTRIBUTION;

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
            status: (item.status || 'PENDING') as InvestmentEventStatus,
            eventSource: eventType.startsWith('OPENING_')
              ? 'MANUAL'
              : 'HISTORICAL_IMPORT',
            sequenceNumber: Number(item.sequenceNumber || sequenceCounter),
            eventDate: parseOptionalDateInput(item.eventDate, 'eventDate') || dueDate,
            amount: normalizeDecimal(item.amount ?? planPayload.amount),
            units: item.units !== undefined ? Number(item.units) : null,
            pricePerUnit:
              item.pricePerUnit !== undefined && item.pricePerUnit !== null
                ? normalizeDecimal(item.pricePerUnit)
                : null,
            netAmount:
              item.netAmount !== undefined && item.netAmount !== null
                ? normalizeDecimal(item.netAmount)
                : null,
            notes: item.notes || null,
            meta: toPrismaMeta(item.meta || null),
          },
        });

        persistedEvents.push(mapEventOutput(event));
        sequenceCounter += 1;
      }

      await this.syncInvestmentDerivedValues(tx, investmentIdNum);

      return {
        plan: mapPlanOutput(createdPlan),
        historicalEvents: persistedEvents,
      };
    });
  }

  async skipCurrentContribution(
    data: SkipCurrentContributionInput,
  ): Promise<SkipCurrentContributionResult> {
    const investmentIdNum = Number(data.investmentId);
    const planIdNum = Number(data.planId);
    const dueDate = parseOptionalDateInput(data.dueDate, 'dueDate');

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.investmentContributionPlan.findUnique({
        where: { id: planIdNum },
      });

      if (!plan || plan.investmentId !== investmentIdNum) {
        throw new Error('Recurring plan not found');
      }

      const investment = await tx.investment.findFirst({
        where: { id: investmentIdNum, userId: data.userId },
      });

      if (!investment) {
        throw new Error('Investment not found');
      }

      if (!dueDate) {
        throw new Error('Current due contribution date is invalid');
      }

      const existingEvent = await tx.investmentEvent.findFirst({
        where: {
          recurringPlanId: planIdNum,
          dueDate,
          eventType: InvestmentEventType.CONTRIBUTION,
        },
      });

      if (existingEvent?.status === 'CONFIRMED') {
        throw new Error('This due contribution is already recorded as paid');
      }

      if (existingEvent?.status === 'SKIPPED') {
        throw new Error('This due contribution was already skipped');
      }

      const notes = data.notes?.trim() || 'Skipped scheduled contribution';

      const skippedEvent = existingEvent
        ? await tx.investmentEvent.update({
            where: { id: existingEvent.id },
            data: {
              status: 'SKIPPED',
              notes,
            },
          })
        : await tx.investmentEvent.create({
            data: {
              investmentId: investmentIdNum,
              recurringPlanId: planIdNum,
              sourceAccountId: plan.sourceAccountId,
              linkedTransactionId: null,
              eventType: InvestmentEventType.CONTRIBUTION,
              dueDate,
              status: 'SKIPPED',
              eventSource: 'RECURRING_PLAN',
              sequenceNumber: null,
              eventDate: dueDate,
              amount: plan.amount,
              notes,
            },
          });

      const updatedPlan = await tx.investmentContributionPlan.update({
        where: { id: planIdNum },
        data: {
          nextDueDate: parseOptionalDateInput(data.nextDueDate, 'nextDueDate'),
        },
      });

      return {
        plan: mapPlanOutput(updatedPlan),
        skippedEvent: mapEventOutput(skippedEvent),
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
            eventType: InvestmentEventType.CONTRIBUTION,
          },
        });

        if (!duplicate) {
          await this.prisma.investmentEvent.create({
            data: {
              investmentId: plan.investmentId,
              recurringPlanId: plan.id,
              sourceAccountId: plan.sourceAccountId,
              linkedTransactionId: null,
              eventType: InvestmentEventType.CONTRIBUTION,
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