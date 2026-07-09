import { dateFromBaseDate } from './shared';
import type { MockInvestmentEvent } from './types';

const baseDate = new Date();

export const mockInvestmentEventsData: MockInvestmentEvent[] = [
  {
    id: 1,
    investmentId: 1,
    sourceAccountId: 1,
    linkedTransactionId: null,
    eventType: 'contribution',
    eventDate: dateFromBaseDate(baseDate, -35),
    amount: 12000,
    units: 145.23,
    pricePerUnit: 82.63,
    netAmount: 12000,
    notes: 'Monthly SIP contribution',
    meta: { frequency: 'monthly' },
    createdAt: dateFromBaseDate(baseDate, -35),
    updatedAt: dateFromBaseDate(baseDate, -35),
  },
  {
    id: 2,
    investmentId: 6,
    sourceAccountId: 2,
    linkedTransactionId: null,
    eventType: 'deposit',
    eventDate: dateFromBaseDate(baseDate, -30),
    amount: 9000,
    units: null,
    pricePerUnit: null,
    netAmount: 9000,
    notes: 'Recurring deposit installment',
    meta: { recurrence: 'monthly' },
    createdAt: dateFromBaseDate(baseDate, -30),
    updatedAt: dateFromBaseDate(baseDate, -30),
  },
];