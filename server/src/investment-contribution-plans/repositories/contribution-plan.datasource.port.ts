import type { InvestmentContributionPlanRecord } from '../investment-contribution-plan.types';
import type { Prisma } from '@prisma/client';
import type {
  ContributionPlanUpdateInput,
  ContributionPlanWriteInput,
  CreatePlanWithHistoricalEventsInput,
  CreatePlanWithHistoricalEventsResult,
  SkipCurrentContributionInput,
  SkipCurrentContributionResult,
} from '../investment-contribution-plan.types';

export interface IContributionPlanDataSourcePort {
  create(data: ContributionPlanWriteInput): Promise<InvestmentContributionPlanRecord>;
  findAllByInvestment(investmentId: string): Promise<InvestmentContributionPlanRecord[]>;
  findAllByInvestmentIds(investmentIds: number[]): Promise<InvestmentContributionPlanRecord[]>;
  findAllByUser(userId: number): Promise<InvestmentContributionPlanRecord[]>;
  findAllActiveByUser(userId: number): Promise<InvestmentContributionPlanRecord[]>;
  findOne(id: string, transaction?: Prisma.TransactionClient): Promise<InvestmentContributionPlanRecord | null>;
  update(id: string, data: ContributionPlanUpdateInput, transaction?: Prisma.TransactionClient): Promise<InvestmentContributionPlanRecord | null>;
  delete(id: string): Promise<void>;
  findActiveByInvestment(investmentId: string): Promise<InvestmentContributionPlanRecord | null>;
  createPlanWithHistoricalEvents(
    data: CreatePlanWithHistoricalEventsInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<CreatePlanWithHistoricalEventsResult>;
  skipCurrentContribution(
    data: SkipCurrentContributionInput,
  ): Promise<SkipCurrentContributionResult>;
  generateDueRecurringInvestmentEvents(data: {
    cutoffDate: Date;
    limit?: number;
  }): Promise<{
    processedPlans: number;
    generatedEvents: number;
  }>;
}
