import { Injectable } from '@nestjs/common';
import { IInvestmentEventRepository } from './investment-event.repository.interface';
import { mockInvestmentEventsData } from '../../mockdata';

let mockInvestmentEvents = [...mockInvestmentEventsData];

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);
const nextInvestmentEventId = () => (mockInvestmentEvents.length ? Math.max(...mockInvestmentEvents.map((event) => event.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class MockInvestmentEventRepository implements IInvestmentEventRepository {
  async create(data: any): Promise<any> {
    const timestamp = new Date();
    const newEvent = {
      id: nextInvestmentEventId(),
      ...data,
      investmentId: Number(data.investmentId),
      sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
      linkedTransactionId: normalizeNullableNumber(data.linkedTransactionId),
      eventDate: new Date(data.eventDate),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestmentEvents.push(newEvent);
    return newEvent;
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
      sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : mockInvestmentEvents[index].sourceAccountId,
      linkedTransactionId: data.linkedTransactionId !== undefined ? normalizeNullableNumber(data.linkedTransactionId) : mockInvestmentEvents[index].linkedTransactionId,
      eventDate: data.eventDate !== undefined ? normalizeDate(data.eventDate) : mockInvestmentEvents[index].eventDate,
      updatedAt: new Date(),
    };

    return mockInvestmentEvents[index];
  }

  async delete(id: string): Promise<void> {
    mockInvestmentEvents = mockInvestmentEvents.filter((event) => event.id !== Number(id));
  }
}