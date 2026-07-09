import { dateFromBaseDate } from './shared';
import type { MockInvestmentGoalAllocation } from './types';

const baseDate = new Date();

export const mockInvestmentGoalAllocationsData: MockInvestmentGoalAllocation[] = [
  {
    id: 1,
    investmentId: 4,
    goalId: 1,
    allocationType: 'percent',
    allocationPercent: 35,
    allocationAmount: null,
    effectiveFrom: dateFromBaseDate(baseDate, -180),
    effectiveTo: null,
    createdAt: dateFromBaseDate(baseDate, -180),
    updatedAt: dateFromBaseDate(baseDate, -180),
  },
  {
    id: 2,
    investmentId: 6,
    goalId: 2,
    allocationType: 'amount',
    allocationPercent: null,
    allocationAmount: 114400,
    effectiveFrom: dateFromBaseDate(baseDate, -60),
    effectiveTo: null,
    createdAt: dateFromBaseDate(baseDate, -60),
    updatedAt: dateFromBaseDate(baseDate, -60),
  },
];