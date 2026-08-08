import { Injectable } from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { IEventDataSourcePort } from './event.datasource.port';
import { mockInvestmentEventsData } from '../../mockdata';
import { mockInvestmentsData } from '../../mockdata/investments';

let mockInvestmentEvents = [...mockInvestmentEventsData];

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);
const nextInvestmentEventId = () => (mockInvestmentEvents.length ? Math.max(...mockInvestmentEvents.map((event) => event.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

const syncInvestmentDerivedValues = (investmentId: number) => {
  const principalIn = mockInvestmentEvents
    .filter(
      (event) =>
        event.investmentId === investmentId &&
        event.status === 'CONFIRMED' &&
        (event.eventType === InvestmentEventType.CONTRIBUTION || event.eventType === InvestmentEventType.OPENING_BALANCE),
    )
    .reduce((sum, event) => sum + Number(event.amount || 0), 0);

  const principalOut = mockInvestmentEvents
    .filter(
      (event) =>
        event.investmentId === investmentId &&
        event.status === 'CONFIRMED' &&
        event.eventType === InvestmentEventType.WITHDRAWAL_PRINCIPAL,
    )
    .reduce((sum, event) => sum + Number(event.amount || 0), 0);

  const historicalIncome = mockInvestmentEvents
    .filter(
      (event) =>
        event.investmentId === investmentId &&
        event.status === 'CONFIRMED' &&
        event.eventType === InvestmentEventType.OPENING_INCOME_CREDIT,
    )
    .reduce((sum, event) => sum + Number(event.amount || 0), 0);

  const latestConfirmedEvent = mockInvestmentEvents
    .filter(
      (event) => event.investmentId === investmentId && event.status === 'CONFIRMED',
    )
    .sort(
      (left, right) =>
        new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime(),
    )[0];

  const investmentIndex = mockInvestmentsData.findIndex((investment) => investment.id === investmentId);
  if (investmentIndex < 0) return;

  const principalTotal = principalIn - principalOut;
  mockInvestmentsData[investmentIndex].totalInvested = principalTotal;
  mockInvestmentsData[investmentIndex].currentValue = principalTotal + historicalIncome;
  mockInvestmentsData[investmentIndex].lastValuationAt = latestConfirmedEvent
    ? new Date(latestConfirmedEvent.eventDate)
    : null;
  mockInvestmentsData[investmentIndex].currentValueSource = 'manual';
};

@Injectable()
export class EventMockRepository implements IEventDataSourcePort {
  async create(data: any): Promise<any> {
    const timestamp = new Date();
    const newEvent = {
      id: nextInvestmentEventId(),
      ...data,
      investmentId: Number(data.investmentId),
      recurringPlanId: normalizeNullableNumber(data.recurringPlanId),
      sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
      linkedTransactionId: normalizeNullableNumber(data.linkedTransactionId),
      eventType: data.eventType,
      dueDate: normalizeDate(data.dueDate),
      status: data.status || 'PENDING',
      eventSource: data.eventSource || 'MANUAL',
      sequenceNumber: normalizeNullableNumber(data.sequenceNumber),
      eventDate: new Date(data.eventDate),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestmentEvents.push(newEvent);
    syncInvestmentDerivedValues(newEvent.investmentId);
    return newEvent;
  }

  async findAll(userId: number): Promise<any[]> {
    const ownedInvestmentIds = new Set(
      mockInvestmentsData
        .filter((investment) => investment.userId === userId)
        .map((investment) => investment.id),
    );

    return mockInvestmentEvents.filter((event) =>
      ownedInvestmentIds.has(event.investmentId),
    );
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return mockInvestmentEvents.filter((event) => event.investmentId === Number(investmentId));
  }

  async findOne(id: string): Promise<any> {
    return mockInvestmentEvents.find((event) => event.id === Number(id));
  }

  async update(id: string, data: any): Promise<any> {
    const index = mockInvestmentEvents.findIndex((event) => event.id === Number(id));
    if (index === -1) return null;

    mockInvestmentEvents[index] = {
      ...mockInvestmentEvents[index],
      ...data,
      investmentId: data.investmentId !== undefined ? Number(data.investmentId) : mockInvestmentEvents[index].investmentId,
      recurringPlanId: data.recurringPlanId !== undefined ? normalizeNullableNumber(data.recurringPlanId) : mockInvestmentEvents[index].recurringPlanId,
      sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : mockInvestmentEvents[index].sourceAccountId,
      linkedTransactionId: data.linkedTransactionId !== undefined ? normalizeNullableNumber(data.linkedTransactionId) : mockInvestmentEvents[index].linkedTransactionId,
      eventType: data.eventType !== undefined ? data.eventType : mockInvestmentEvents[index].eventType,
      dueDate: data.dueDate !== undefined ? normalizeDate(data.dueDate) : mockInvestmentEvents[index].dueDate,
      status: data.status !== undefined ? data.status : mockInvestmentEvents[index].status,
      eventSource: data.eventSource !== undefined ? data.eventSource : mockInvestmentEvents[index].eventSource,
      sequenceNumber:
        data.sequenceNumber !== undefined
          ? normalizeNullableNumber(data.sequenceNumber)
          : mockInvestmentEvents[index].sequenceNumber,
      eventDate: data.eventDate !== undefined ? normalizeDate(data.eventDate) : mockInvestmentEvents[index].eventDate,
      updatedAt: new Date(),
    };

    syncInvestmentDerivedValues(mockInvestmentEvents[index].investmentId);
    return mockInvestmentEvents[index];
  }

  async delete(id: string): Promise<void> {
    const existing = mockInvestmentEvents.find((event) => event.id === Number(id));
    mockInvestmentEvents = mockInvestmentEvents.filter((event) => event.id !== Number(id));
    if (existing?.investmentId) {
      syncInvestmentDerivedValues(existing.investmentId);
    }
  }
}