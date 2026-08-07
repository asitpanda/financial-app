import { Injectable } from '@nestjs/common';
import { mockInvestmentContributionPlansData } from '../../mockdata';
import { mockInvestmentEventsData } from '../../mockdata/investmentEvents';
import { mockInvestmentsData } from '../../mockdata/investments';
import { mockFinancialAccountsData } from '../../mockdata/financialAccounts';
import type { InvestmentEventRecord } from '../../domain/types';
import { IContributionPlanDataSourcePort } from './contribution-plan.datasource.port';

let mockInvestmentContributionPlans = [...mockInvestmentContributionPlansData];
let mockInvestmentEvents = [...mockInvestmentEventsData];

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const nextPlanId = () =>
  mockInvestmentContributionPlans.length ? Math.max(...mockInvestmentContributionPlans.map((plan) => plan.id)) + 1 : 1;

@Injectable()
export class ContributionPlanMockRepository implements IContributionPlanDataSourcePort {
  async create(data: any): Promise<any> {
    const timestamp = new Date();
    const newPlan = {
      id: nextPlanId(),
      ...data,
      investmentId: Number(data.investmentId),
      sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
      reminderDaysBefore: normalizeNullableNumber(data.reminderDaysBefore),
      anchorDate: new Date(data.anchorDate),
      nextDueDate: normalizeDate(data.nextDueDate),
      endDate: normalizeDate(data.endDate),
      autoCreateEvent: Boolean(data.autoCreateEvent),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestmentContributionPlans.push(newPlan);
    return newPlan;
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return mockInvestmentContributionPlans.filter((plan) => plan.investmentId === Number(investmentId));
  }

  async findOne(id: string): Promise<any> {
    return mockInvestmentContributionPlans.find((plan) => plan.id === Number(id));
  }

  async update(id: string, data: any): Promise<any> {
    const index = mockInvestmentContributionPlans.findIndex((plan) => plan.id === Number(id));
    if (index === -1) return null;

    mockInvestmentContributionPlans[index] = {
      ...mockInvestmentContributionPlans[index],
      ...data,
      investmentId: data.investmentId !== undefined ? Number(data.investmentId) : mockInvestmentContributionPlans[index].investmentId,
      sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : mockInvestmentContributionPlans[index].sourceAccountId,
      reminderDaysBefore:
        data.reminderDaysBefore !== undefined
          ? normalizeNullableNumber(data.reminderDaysBefore)
          : mockInvestmentContributionPlans[index].reminderDaysBefore,
      anchorDate: data.anchorDate !== undefined ? new Date(data.anchorDate) : mockInvestmentContributionPlans[index].anchorDate,
      nextDueDate: data.nextDueDate !== undefined ? normalizeDate(data.nextDueDate) : mockInvestmentContributionPlans[index].nextDueDate,
      endDate: data.endDate !== undefined ? normalizeDate(data.endDate) : mockInvestmentContributionPlans[index].endDate,
      autoCreateEvent:
        data.autoCreateEvent !== undefined ? Boolean(data.autoCreateEvent) : mockInvestmentContributionPlans[index].autoCreateEvent,
      updatedAt: new Date(),
    };

    return mockInvestmentContributionPlans[index];
  }

  async delete(id: string): Promise<void> {
    mockInvestmentContributionPlans = mockInvestmentContributionPlans.filter((plan) => plan.id !== Number(id));
  }

  async findActiveByInvestment(investmentId: string): Promise<any | null> {
    return (
      mockInvestmentContributionPlans.find(
        (plan) => plan.investmentId === Number(investmentId) && String(plan.status).toLowerCase() === 'active',
      ) || null
    );
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

    const investment = mockInvestmentsData.find((inv) => inv.id === investmentIdNum && inv.userId === userId);
    if (!investment) {
      throw new Error('Investment not found');
    }

    if (sourceAccountId) {
      const account = mockFinancialAccountsData.find((acc) => acc.id === sourceAccountId && acc.userId === userId);
      if (!account) {
        throw new Error('Source account not found or ownership mismatch');
      }
    }

    if (String(planPayload.status || '').toLowerCase() === 'active') {
      const existingActive = mockInvestmentContributionPlans.find(
        (plan) => plan.investmentId === investmentIdNum && String(plan.status).toLowerCase() === 'active',
      );
      if (existingActive) {
        throw new Error('An active recurring plan already exists for this investment');
      }
    }

    const timestamp = new Date();
    const newPlan = {
      id: nextPlanId(),
      investmentId: investmentIdNum,
      sourceAccountId,
      status: planPayload.status || 'active',
      amount: Number(planPayload.amount),
      cadenceUnit: String(planPayload.cadenceUnit),
      cadenceInterval: Number(planPayload.cadenceInterval),
      historicalImportMode: planPayload.historicalImportMode || 'TRACK_FROM_TODAY',
      anchorDate: new Date(planPayload.anchorDate),
      lastGeneratedDueDate: normalizeDate(planPayload.lastGeneratedDueDate),
      nextDueDate: normalizeDate(planPayload.nextDueDate),
      endDate: normalizeDate(planPayload.endDate),
      reminderDaysBefore: normalizeNullableNumber(planPayload.reminderDaysBefore),
      autoCreateEvent: Boolean(planPayload.autoCreateEvent),
      notes: planPayload.notes || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestmentContributionPlans.push(newPlan);

    const historicalEvents: any[] = [];
    let sequenceCounter = 1;
    for (const item of selectedHistoricalItems || []) {
      if (!item?.selected) continue;
      const dueDate = normalizeDate(item.dueDate);
      if (!dueDate) continue;

      const eventType = String(item.eventType || 'CONTRIBUTION');
      const duplicate = mockInvestmentEvents.find(
        (event) =>
          event.recurringPlanId === newPlan.id &&
          event.eventType === eventType &&
          event.dueDate &&
          new Date(event.dueDate).toISOString() === dueDate.toISOString(),
      );

      if (duplicate) {
        throw new Error(`Duplicate recurring event for dueDate ${dueDate.toISOString()}`);
      }

      const newEvent: InvestmentEventRecord = {
        id: mockInvestmentEvents.length ? Math.max(...mockInvestmentEvents.map((event) => event.id)) + 1 : 1,
        investmentId: investmentIdNum,
        recurringPlanId: newPlan.id,
        sourceAccountId,
        linkedTransactionId: null,
        eventType,
        dueDate,
        status: item.status || 'PENDING',
        eventSource: eventType.startsWith('OPENING_') ? 'MANUAL' : 'HISTORICAL_IMPORT',
        sequenceNumber: Number(item.sequenceNumber || sequenceCounter),
        eventDate: normalizeDate(item.eventDate) || dueDate,
        amount: Number(item.amount ?? newPlan.amount),
        units: item.units !== undefined ? Number(item.units) : null,
        pricePerUnit: item.pricePerUnit !== undefined ? Number(item.pricePerUnit) : null,
        netAmount: item.netAmount !== undefined ? Number(item.netAmount) : null,
        notes: item.notes || null,
        meta: item.meta || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInvestmentEvents.push(newEvent);
      historicalEvents.push(newEvent);
      sequenceCounter += 1;
    }

    const principalIn = mockInvestmentEvents
      .filter(
        (event) =>
          event.investmentId === investmentIdNum &&
          event.status === 'CONFIRMED' &&
          (event.eventType === 'CONTRIBUTION' || event.eventType === 'OPENING_BALANCE'),
      )
      .reduce((sum, event) => sum + Number(event.amount || 0), 0);

    const principalOut = mockInvestmentEvents
      .filter(
        (event) =>
          event.investmentId === investmentIdNum &&
          event.status === 'CONFIRMED' &&
          event.eventType === 'WITHDRAWAL_PRINCIPAL',
      )
      .reduce((sum, event) => sum + Number(event.amount || 0), 0);

    const investmentIndex = mockInvestmentsData.findIndex((inv) => inv.id === investmentIdNum);
    if (investmentIndex >= 0) {
      mockInvestmentsData[investmentIndex].totalInvested = principalIn - principalOut;
    }

    return {
      plan: newPlan,
      historicalEvents,
    };
  }

  async skipCurrentContribution(data: {
    investmentId: string;
    planId: string;
    userId: number;
    dueDate: string;
    nextDueDate: string | null;
    notes?: string;
  }): Promise<any> {
    const investmentIdNum = Number(data.investmentId);
    const planIdNum = Number(data.planId);
    const dueDate = normalizeDate(data.dueDate);

    const plan = mockInvestmentContributionPlans.find(
      (item) => item.id === planIdNum && item.investmentId === investmentIdNum,
    );
    if (!plan) {
      throw new Error('Recurring plan not found');
    }

    const investment = mockInvestmentsData.find(
      (item) => item.id === investmentIdNum && item.userId === data.userId,
    );
    if (!investment) {
      throw new Error('Investment not found');
    }

    if (!dueDate) {
      throw new Error('Current due contribution date is invalid');
    }

    const existingEventIndex = mockInvestmentEvents.findIndex(
      (event) =>
        event.recurringPlanId === planIdNum &&
        event.eventType === 'CONTRIBUTION' &&
        event.dueDate &&
        new Date(event.dueDate).toISOString() === dueDate.toISOString(),
    );

    if (existingEventIndex >= 0) {
      if (mockInvestmentEvents[existingEventIndex].status === 'CONFIRMED') {
        throw new Error('This due contribution is already recorded as paid');
      }
      if (mockInvestmentEvents[existingEventIndex].status === 'SKIPPED') {
        throw new Error('This due contribution was already skipped');
      }

      mockInvestmentEvents[existingEventIndex] = {
        ...mockInvestmentEvents[existingEventIndex],
        status: 'SKIPPED',
        notes: data.notes?.trim() || 'Skipped scheduled contribution',
        updatedAt: new Date(),
      };
    } else {
      mockInvestmentEvents.push({
        id: mockInvestmentEvents.length ? Math.max(...mockInvestmentEvents.map((event) => event.id)) + 1 : 1,
        investmentId: investmentIdNum,
        recurringPlanId: planIdNum,
        sourceAccountId: plan.sourceAccountId,
        linkedTransactionId: null,
        eventType: 'CONTRIBUTION',
        dueDate,
        status: 'SKIPPED',
        eventSource: 'RECURRING_PLAN',
        sequenceNumber: null,
        eventDate: dueDate,
        amount: Number(plan.amount),
        units: null,
        pricePerUnit: null,
        netAmount: null,
        notes: data.notes?.trim() || 'Skipped scheduled contribution',
        meta: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    plan.nextDueDate = normalizeDate(data.nextDueDate);
    plan.updatedAt = new Date();

    return {
      plan,
      skippedEvent:
        existingEventIndex >= 0
          ? mockInvestmentEvents[existingEventIndex]
          : mockInvestmentEvents[mockInvestmentEvents.length - 1],
    };
  }

  async generateDueRecurringInvestmentEvents(data: {
    cutoffDate: Date;
    limit?: number;
  }): Promise<{ processedPlans: number; generatedEvents: number }> {
    const cutoffDate = new Date(data.cutoffDate);
    const limit = data.limit ?? 200;
    const activePlans = mockInvestmentContributionPlans
      .filter((plan) => String(plan.status).toLowerCase() === 'active' && plan.nextDueDate && plan.nextDueDate <= cutoffDate)
      .sort((left, right) => (left.nextDueDate?.getTime() || 0) - (right.nextDueDate?.getTime() || 0))
      .slice(0, limit);

    let generatedEvents = 0;

    for (const plan of activePlans) {
      let nextDueDate = plan.nextDueDate ? new Date(plan.nextDueDate) : new Date(plan.anchorDate);
      let lastGeneratedDueDate: Date | null = null;

      while (nextDueDate && nextDueDate <= cutoffDate) {
        if (plan.endDate && nextDueDate > plan.endDate) break;

        const generatedDueDate = new Date(nextDueDate);

        const duplicate = mockInvestmentEvents.find(
          (event) =>
            event.recurringPlanId === plan.id &&
            event.eventType === 'CONTRIBUTION' &&
            event.dueDate &&
            new Date(event.dueDate).toISOString() === nextDueDate.toISOString(),
        );

        if (!duplicate) {
          mockInvestmentEvents.push({
            id: mockInvestmentEvents.length ? Math.max(...mockInvestmentEvents.map((event) => event.id)) + 1 : 1,
            investmentId: plan.investmentId,
            recurringPlanId: plan.id,
            sourceAccountId: plan.sourceAccountId,
            linkedTransactionId: null,
            eventType: 'CONTRIBUTION',
            dueDate: new Date(nextDueDate),
            status: 'EXPECTED',
            eventSource: 'SYSTEM_GENERATED',
            sequenceNumber: null,
            eventDate: new Date(nextDueDate),
            amount: Number(plan.amount),
            units: null,
            pricePerUnit: null,
            netAmount: null,
            notes: null,
            meta: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          generatedEvents += 1;
        }

        lastGeneratedDueDate = generatedDueDate;
        nextDueDate = this.advanceByCadence(nextDueDate, plan.cadenceUnit, plan.cadenceInterval, plan.anchorDate);
      }

      plan.nextDueDate = nextDueDate;
      plan.lastGeneratedDueDate = lastGeneratedDueDate;
      plan.updatedAt = new Date();
    }

    return {
      processedPlans: activePlans.length,
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