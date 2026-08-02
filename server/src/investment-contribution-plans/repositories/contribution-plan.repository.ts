import { Inject, Injectable } from '@nestjs/common';
import { IContributionPlanDataSourcePort } from './contribution-plan.datasource.port';

@Injectable()
export class ContributionPlanRepository {
  constructor(
    @Inject('INVESTMENT_CONTRIBUTION_PLAN_DATA_SOURCE')
    private readonly dataSource: IContributionPlanDataSourcePort,
  ) {}

  async create(data: any): Promise<any> {
    return this.dataSource.create(data);
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return this.dataSource.findAllByInvestment(investmentId);
  }

  async findOne(id: string): Promise<any> {
    return this.dataSource.findOne(id);
  }

  async update(id: string, data: any): Promise<any> {
    return this.dataSource.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.dataSource.delete(id);
  }

  async findActiveByInvestment(investmentId: string): Promise<any | null> {
    return this.dataSource.findActiveByInvestment(investmentId);
  }

  async createPlanWithHistoricalEvents(data: {
    investmentId: string;
    userId: number;
    planPayload: any;
    selectedHistoricalItems: any[];
  }): Promise<any> {
    return this.dataSource.createPlanWithHistoricalEvents(data);
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
