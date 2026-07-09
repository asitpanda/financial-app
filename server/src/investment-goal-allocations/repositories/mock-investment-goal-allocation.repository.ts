import { Injectable } from '@nestjs/common';
import { IInvestmentGoalAllocationRepository } from './investment-goal-allocation.repository.interface';
import { mockInvestmentGoalAllocationsData } from '../../mockdata';

let mockInvestmentGoalAllocations = [...mockInvestmentGoalAllocationsData];

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);
const nextAllocationId = () => (mockInvestmentGoalAllocations.length ? Math.max(...mockInvestmentGoalAllocations.map((allocation) => allocation.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

@Injectable()
export class MockInvestmentGoalAllocationRepository implements IInvestmentGoalAllocationRepository {
  async create(data: any): Promise<any> {
    const timestamp = new Date();
    const newAllocation = {
      id: nextAllocationId(),
      ...data,
      investmentId: Number(data.investmentId),
      goalId: Number(data.goalId),
      allocationPercent: normalizeNullableNumber(data.allocationPercent),
      allocationAmount: normalizeNullableNumber(data.allocationAmount),
      effectiveFrom: normalizeDate(data.effectiveFrom),
      effectiveTo: normalizeDate(data.effectiveTo),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockInvestmentGoalAllocations.push(newAllocation);
    return newAllocation;
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return mockInvestmentGoalAllocations.filter((allocation) => allocation.investmentId === Number(investmentId));
  }

  async findOne(id: string): Promise<any> {
    return mockInvestmentGoalAllocations.find((allocation) => allocation.id === Number(id));
  }

  async update(id: string, data: any): Promise<any> {
    const index = mockInvestmentGoalAllocations.findIndex((allocation) => allocation.id === Number(id));
    if (index === -1) return null;

    mockInvestmentGoalAllocations[index] = {
      ...mockInvestmentGoalAllocations[index],
      ...data,
      investmentId: data.investmentId !== undefined ? Number(data.investmentId) : mockInvestmentGoalAllocations[index].investmentId,
      goalId: data.goalId !== undefined ? Number(data.goalId) : mockInvestmentGoalAllocations[index].goalId,
      allocationPercent: data.allocationPercent !== undefined ? normalizeNullableNumber(data.allocationPercent) : mockInvestmentGoalAllocations[index].allocationPercent,
      allocationAmount: data.allocationAmount !== undefined ? normalizeNullableNumber(data.allocationAmount) : mockInvestmentGoalAllocations[index].allocationAmount,
      effectiveFrom: data.effectiveFrom !== undefined ? normalizeDate(data.effectiveFrom) : mockInvestmentGoalAllocations[index].effectiveFrom,
      effectiveTo: data.effectiveTo !== undefined ? normalizeDate(data.effectiveTo) : mockInvestmentGoalAllocations[index].effectiveTo,
      updatedAt: new Date(),
    };

    return mockInvestmentGoalAllocations[index];
  }

  async delete(id: string): Promise<void> {
    mockInvestmentGoalAllocations = mockInvestmentGoalAllocations.filter((allocation) => allocation.id !== Number(id));
  }
}