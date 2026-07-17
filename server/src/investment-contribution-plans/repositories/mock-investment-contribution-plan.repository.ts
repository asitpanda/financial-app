import { Injectable } from '@nestjs/common';
import { mockInvestmentContributionPlansData } from '../../mockdata';
import { IInvestmentContributionPlanRepository } from './investment-contribution-plan.repository.interface';

let mockInvestmentContributionPlans = [...mockInvestmentContributionPlansData];

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);
const nextPlanId = () =>
  mockInvestmentContributionPlans.length ? Math.max(...mockInvestmentContributionPlans.map((plan) => plan.id)) + 1 : 1;

@Injectable()
export class MockInvestmentContributionPlanRepository implements IInvestmentContributionPlanRepository {
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
}