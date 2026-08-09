import type { InvestmentContributionPlanRecord } from '../investment-contribution-plan.types';
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
  findAllByUser(userId: number): Promise<InvestmentContributionPlanRecord[]>;
  findAllActiveByUser(userId: number): Promise<InvestmentContributionPlanRecord[]>;
  findOne(id: string): Promise<InvestmentContributionPlanRecord | null>;
  update(id: string, data: ContributionPlanUpdateInput): Promise<InvestmentContributionPlanRecord | null>;
  delete(id: string): Promise<void>;
  findActiveByInvestment(investmentId: string): Promise<InvestmentContributionPlanRecord | null>;
  createPlanWithHistoricalEvents(
    data: CreatePlanWithHistoricalEventsInput,
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
