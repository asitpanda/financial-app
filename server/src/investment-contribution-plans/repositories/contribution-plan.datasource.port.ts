export interface IContributionPlanDataSourcePort {
  create(data: any): Promise<any>;
  findAllByInvestment(investmentId: string): Promise<any[]>;
  findOne(id: string): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findActiveByInvestment(investmentId: string): Promise<any | null>;
  createPlanWithHistoricalEvents(data: {
    investmentId: string;
    userId: number;
    planPayload: any;
    selectedHistoricalItems: any[];
  }): Promise<any>;
  generateDueRecurringInvestmentEvents(data: {
    cutoffDate: Date;
    limit?: number;
  }): Promise<{
    processedPlans: number;
    generatedEvents: number;
  }>;
}
