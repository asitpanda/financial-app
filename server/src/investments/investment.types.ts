import { InvestmentEventType } from '@prisma/client';
import type { CreateInvestmentDto } from './dto/create-investment.dto';
import type { InvestmentActiveContributionPlanResponseDto } from './dto/investment-detail-response.dto';

export type InvestmentRecord = {
  id: number;
  userId: number;
  accountId: number | null;
  assetTaxonomyId: number | null;
  assetTypeMetaId: number;
  assetCategoryMetaId: number;
  name: string;
  assetType: string;
  assetCategory: string;
  institutionName: string | null;
  referenceNumber: string | null;
  status: string;
  currency: string;
  startDate: Date | null;
  maturityDate: Date | null;
  totalInvested: number;
  currentValue: number;
  currentValueSource: string | null;
  lastValuationAt: Date | null;
  insuranceCover: number | null;
  contributionMode: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivePlanLike = {
  id: string | number;
  amount: number;
  cadenceUnit: string;
  cadenceInterval: number;
  historicalImportMode?: string | null;
  anchorDate?: string | Date | null;
  nextDueDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: string | null;
};

export type InvestmentLike = InvestmentRecord;

export type SnapshotLike = {
  id: string | number;
  investmentId?: string | number | null;
  snapshotDate?: string | Date | null;
  marketValue?: number | null;
  units?: number | null;
  price?: number | null;
  source?: string | null;
};

export type EventLike = {
  id?: string | number;
  status?: string | null;
  eventType?: InvestmentEventType | null;
  eventDate?: string | Date | null;
  dueDate?: string | Date | null;
  amount?: number | null;
};

export type SummaryInvestment = InvestmentLike & {
  activeContributionPlan?: InvestmentActiveContributionPlanResponseDto | null;
  categoryKey?: string;
};

export type ResolvedAnalyticsRecord = {
  id: string | number;
  investment: SummaryInvestment;
  category: string;
  investedAmount: number;
  currentValue: number;
  returnAmount: number;
  timelineStartDate: Date;
  snapshots: SnapshotLike[];
};

export type TimeSeriesPoint = {
  label: string;
  invested: number;
  return: number;
  investedBreakdown: Record<string, number>;
  returnBreakdown: Record<string, number>;
};

export type InvestmentCrudRuleInput = Partial<
  Omit<CreateInvestmentDto, 'startDate' | 'maturityDate' | 'lastValuationAt'>
> & {
  startDate?: string | Date | null;
  maturityDate?: string | Date | null;
  lastValuationAt?: string | Date | null;
};
