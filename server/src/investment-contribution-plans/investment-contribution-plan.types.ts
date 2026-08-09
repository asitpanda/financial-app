import type { CreateInvestmentContributionPlanDto } from './dto/create-investment-contribution-plan.dto';
import type { HistoricalContributionItemDto } from './dto/historical-contribution-item.dto';
import type { InvestmentEventRecord } from '../investment-events/investment-event.types';

export type InvestmentContributionPlanRecord = {
  id: number;
  investmentId: number;
  sourceAccountId: number | null;
  status: string;
  amount: number;
  cadenceUnit: string;
  cadenceInterval: number;
  historicalImportMode: string;
  anchorDate: Date;
  lastGeneratedDueDate: Date | null;
  nextDueDate: Date | null;
  endDate: Date | null;
  reminderDaysBefore: number | null;
  autoCreateEvent: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContributionPlanWriteInput = Omit<
  CreateInvestmentContributionPlanDto,
  'anchorDate' | 'lastGeneratedDueDate' | 'nextDueDate' | 'endDate'
> & {
  anchorDate: string | Date;
  lastGeneratedDueDate?: string | Date | null;
  nextDueDate?: string | Date | null;
  endDate?: string | Date | null;
};

export type ContributionPlanUpdateInput = Partial<ContributionPlanWriteInput>;

export type HistoricalContributionItemInput = Omit<
  HistoricalContributionItemDto,
  'dueDate' | 'eventDate'
> & {
  dueDate: string | Date;
  eventDate?: string | Date;
  units?: number | null;
  pricePerUnit?: number | null;
  netAmount?: number | null;
  meta?: Record<string, unknown> | null;
};

export type CreatePlanWithHistoricalEventsInput = {
  investmentId: string;
  userId: number;
  planPayload: ContributionPlanWriteInput;
  selectedHistoricalItems: HistoricalContributionItemInput[];
};

export type CreatePlanWithHistoricalEventsResult = {
  plan: InvestmentContributionPlanRecord;
  historicalEvents: InvestmentEventRecord[];
};

export type SkipCurrentContributionInput = {
  investmentId: string;
  planId: string;
  userId: number;
  dueDate: string;
  nextDueDate: string | null;
  notes?: string;
};

export type SkipCurrentContributionResult = {
  plan: InvestmentContributionPlanRecord;
  skippedEvent: InvestmentEventRecord;
};

export type PreviewOpeningBalanceOccurrence = {
  sequenceNumber: number;
  dueDate: string;
  amount: number;
  selected: true;
  suggestedStatus: 'CONFIRMED';
  source: 'OPENING_BALANCE';
  eventType: 'OPENING_BALANCE' | 'OPENING_INCOME_CREDIT';
};

export type RecurringPlanLike = {
  nextDueDate?: string | Date | null;
  anchorDate: string | Date;
  cadenceUnit: string;
  cadenceInterval: number;
};
