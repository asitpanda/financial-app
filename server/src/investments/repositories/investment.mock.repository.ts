import { Injectable } from '@nestjs/common';
import { IInvestmentDataSourcePort } from './investment.datasource.port';
import { mockInvestmentsData } from '../../mockdata';

let mockInvestments = [...mockInvestmentsData];

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);
const nextInvestmentId = () => (mockInvestments.length ? Math.max(...mockInvestments.map((investment) => investment.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class InvestmentMockRepository implements IInvestmentDataSourcePort {
  async create(data: any, userId: number): Promise<any> {
    const timestamp = new Date();
    const newInvestment = {
      id: nextInvestmentId(),
      ...data,
      accountId: normalizeNullableNumber(data.accountId),
      contributionMode: data.contributionMode ?? null,
      startDate: normalizeDate(data.startDate),
      maturityDate: normalizeDate(data.maturityDate),
      lastValuationAt: normalizeDate(data.lastValuationAt),
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestments.unshift(newInvestment);
    return newInvestment;
  }

  async findAll(userId: number): Promise<any[]> {
    return mockInvestments.filter((investment) => investment.userId === userId);
  }

  async findOne(id: number, userId: number): Promise<any> {
    return mockInvestments.find((investment) => investment.id === id && investment.userId === userId);
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    const index = mockInvestments.findIndex((investment) => investment.id === id && investment.userId === userId);
    if (index === -1) return null;

    mockInvestments[index] = {
      ...mockInvestments[index],
      ...data,
      accountId: data.accountId !== undefined ? normalizeNullableNumber(data.accountId) : mockInvestments[index].accountId,
      contributionMode: data.contributionMode !== undefined ? data.contributionMode : mockInvestments[index].contributionMode,
      startDate: data.startDate !== undefined ? normalizeDate(data.startDate) : mockInvestments[index].startDate,
      maturityDate: data.maturityDate !== undefined ? normalizeDate(data.maturityDate) : mockInvestments[index].maturityDate,
      lastValuationAt: data.lastValuationAt !== undefined ? normalizeDate(data.lastValuationAt) : mockInvestments[index].lastValuationAt,
      updatedAt: new Date(),
    };

    return mockInvestments[index];
  }

  async delete(id: number, userId: number): Promise<void> {
    mockInvestments = mockInvestments.filter((investment) => !(investment.id === id && investment.userId === userId));
  }
}