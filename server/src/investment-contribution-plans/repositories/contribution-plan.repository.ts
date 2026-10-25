import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { InvestmentContributionPlanRecord } from '../investment-contribution-plan.types';
import {
  ContributionPlanUpdateInput,
  ContributionPlanWriteInput,
  CreatePlanWithHistoricalEventsInput,
  CreatePlanWithHistoricalEventsResult,
  SkipCurrentContributionInput,
  SkipCurrentContributionResult,
} from '../investment-contribution-plan.types';
import type { IContributionPlanDataSourcePort as IContributionPlanDataSourcePortType } from './contribution-plan.datasource.port';

@Injectable()
export class ContributionPlanRepository {
  constructor(
    @Inject('INVESTMENT_CONTRIBUTION_PLAN_DATA_SOURCE')
    private readonly dataSource: IContributionPlanDataSourcePortType,
  ) {}

  async create(data: ContributionPlanWriteInput): Promise<InvestmentContributionPlanRecord> {
    return this.dataSource.create(data);
  }

  async findAllByInvestment(investmentId: string): Promise<InvestmentContributionPlanRecord[]> {
    return this.dataSource.findAllByInvestment(investmentId);
  }

  async findAllByInvestmentIds(investmentIds: number[]): Promise<InvestmentContributionPlanRecord[]> {
    return this.dataSource.findAllByInvestmentIds(investmentIds);
  }

  async findAllByUser(userId: number): Promise<InvestmentContributionPlanRecord[]> {
    return this.dataSource.findAllByUser(userId);
  }

  async findAllActiveByUser(userId: number): Promise<InvestmentContributionPlanRecord[]> {
    return this.dataSource.findAllActiveByUser(userId);
  }

  async findOne(id: string, transaction?: Prisma.TransactionClient): Promise<InvestmentContributionPlanRecord | null> {
    return this.dataSource.findOne(id, transaction);
  }

  async update(
    id: string,
    data: ContributionPlanUpdateInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<InvestmentContributionPlanRecord | null> {
    return this.dataSource.update(id, data, transaction);
  }

  async delete(id: string): Promise<void> {
    return this.dataSource.delete(id);
  }

  async findActiveByInvestment(
    investmentId: string,
  ): Promise<InvestmentContributionPlanRecord | null> {
    return this.dataSource.findActiveByInvestment(investmentId);
  }

  async createPlanWithHistoricalEvents(
    data: CreatePlanWithHistoricalEventsInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<CreatePlanWithHistoricalEventsResult> {
    return this.dataSource.createPlanWithHistoricalEvents(data, transaction);
  }

  async skipCurrentContribution(
    data: SkipCurrentContributionInput,
  ): Promise<SkipCurrentContributionResult> {
    return this.dataSource.skipCurrentContribution(data);
  }

  async generateDueRecurringInvestmentEvents(data: {
    cutoffDate: Date;
    limit?: number;
  }): Promise<{
    processedPlans: number;
    generatedEvents: number;
  }> {
    return this.dataSource.generateDueRecurringInvestmentEvents(data);
  }
}
