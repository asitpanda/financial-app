import type { InvestmentEventType } from '@prisma/client';

export type InvestmentEventRecord = {
  id: number;
  investmentId: number;
  recurringPlanId: number | null;
  linkedTransactionId: number | null;
  eventType: InvestmentEventType;
  dueDate: Date | null;
  status:
    | 'EXPECTED'
    | 'PENDING'
    | 'CONFIRMED'
    | 'SKIPPED'
    | 'FAILED'
    | 'CANCELLED';
  eventSource:
    | 'MANUAL'
    | 'RECURRING_PLAN'
    | 'HISTORICAL_IMPORT'
    | 'BANK_IMPORT'
    | 'BROKER_IMPORT'
    | 'SYSTEM_GENERATED';
  sequenceNumber: number | null;
  eventDate: Date;
  amount: number | null;
  units: number | null;
  pricePerUnit: number | null;
  netAmount: number | null;
  notes: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};
