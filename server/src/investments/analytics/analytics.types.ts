import type { InvestmentEventType } from '@prisma/client';
import type { EventLike, SnapshotLike, SummaryInvestment } from '../investment.types';

export type AnalyticsQuery = {
  range: 'ALL';
  granularity: 'YEAR';
  calendar: 'FISCAL';
  fiscalYearStartMonth: number;
  from?: Date;
  to?: Date;
};

export type AnalyticsPeriod = { key: string; label: string; startDate: Date; endDate: Date };
export type AnalyticsActivity = { newContribution: number; newWithdrawal: number; newPremium: number; newIncomeCredit: number; netCashFlow: number };
export type AnalyticsState = { cumulativeInvested: number; cumulativeWithdrawn: number; portfolioValue: number; returnAmount: number };
export type AnalyticsPoint = { period: AnalyticsPeriod; activity: AnalyticsActivity; state: AnalyticsState; dataQuality: { cashFlow: 'complete'; portfolioValue: 'observed' | 'derived' | 'carried_forward' | 'unknown' } };
export type AnalyticsFacts = { investments: SummaryInvestment[]; events: EventLike[]; snapshots: SnapshotLike[] };

export const ACTIVITY_EVENT_TYPES = new Set<InvestmentEventType>([
  'CONTRIBUTION' as InvestmentEventType,
  'OPENING_BALANCE' as InvestmentEventType,
  'WITHDRAWAL_PRINCIPAL' as InvestmentEventType,
  'PREMIUM' as InvestmentEventType,
  'INCOME_CREDIT' as InvestmentEventType,
  'OPENING_INCOME_CREDIT' as InvestmentEventType,
]);