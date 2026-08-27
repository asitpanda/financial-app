import { ApiProperty } from '@nestjs/swagger';

export class InvestmentValueSourceSummaryDto {
  @ApiProperty()
  snapshotBackedValue: number;

  @ApiProperty()
  estimatedValue: number;

  @ApiProperty()
  investedOnlyValue: number;

  @ApiProperty()
  snapshotBackedCount: number;

  @ApiProperty()
  estimatedCount: number;

  @ApiProperty()
  investedOnlyCount: number;

  @ApiProperty()
  staleValuationCount: number;

  @ApiProperty()
  staleValuationValue: number;

  @ApiProperty({ type: [String] })
  snapshotBackedIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  estimatedIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  investedOnlyIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  staleValuationIds: Array<string | number>;
}

export class InvestmentDashboardSummaryDto {
  @ApiProperty()
  totalInvestments: number;

  // The following totals only include products with accountingTreatment === INVESTMENT.
  @ApiProperty()
  totalInvested: number;

  @ApiProperty()
  totalCurrentValue: number;

  @ApiProperty()
  totalReturn: number;

  @ApiProperty()
  returnPercentage: number;

  @ApiProperty()
  upcomingMaturity: number;

  @ApiProperty()
  insuranceCover: number;

  // Cumulative premium/contribution paid toward INSURANCE_SAVINGS products - not blended into totalInvested/totalReturn.
  @ApiProperty()
  insuranceSavingsContribution: number;

  // Cumulative premium paid toward PROTECTION_EXPENSE products - reported as expense, excluded from portfolio value entirely.
  @ApiProperty()
  protectionExpenseTotal: number;

  @ApiProperty({ type: InvestmentValueSourceSummaryDto })
  valueSourceSummary: InvestmentValueSourceSummaryDto;
}

export class InvestmentDashboardUpcomingItemDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  item: Record<string, unknown>;
}

export class InvestmentDashboardUpcomingDto {
  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  upcomingContributions: Record<string, unknown>[];

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  recentInvestments: Record<string, unknown>[];

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  topCurrentValueItems: Record<string, unknown>[];

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true } })
  upcomingMaturities: Record<string, unknown>[];
}

export class InvestmentDashboardPortfolioGrowthPointDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  investedToDate: number;

  @ApiProperty()
  currentValueToDate: number;

  @ApiProperty()
  returnToDate: number;

  @ApiProperty()
  snapshotBackedValue: number;

  @ApiProperty()
  estimatedValue: number;

  @ApiProperty()
  investedOnlyValue: number;
}

export class InvestmentDashboardSeriesPointDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  invested: number;

  @ApiProperty()
  return: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  investedBreakdown: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  returnBreakdown: Record<string, number>;
}

export class InvestmentDashboardTimeSeriesDto {
  @ApiProperty({ type: [InvestmentDashboardSeriesPointDto] })
  yearly: InvestmentDashboardSeriesPointDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/InvestmentDashboardSeriesPointDto' },
    },
  })
  monthlyByYear: Record<string, InvestmentDashboardSeriesPointDto[]>;
}

export class InvestmentDashboardCategoryPerformanceRowDto {
  @ApiProperty()
  key: string;

  @ApiProperty({ required: false })
  assetType?: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  holdings: number;

  @ApiProperty()
  invested: number;

  @ApiProperty()
  currentValue: number;

  @ApiProperty()
  returnAmount: number;

  @ApiProperty()
  returnPercentage: number;

  @ApiProperty({ type: [Number] })
  sparkline: number[];

  @ApiProperty({ type: [String] })
  investmentIds: Array<string | number>;
}

export class InvestmentDashboardAnalyticsDto {
  @ApiProperty({ type: [InvestmentDashboardPortfolioGrowthPointDto] })
  portfolioGrowthData: InvestmentDashboardPortfolioGrowthPointDto[];

  @ApiProperty({ type: InvestmentDashboardTimeSeriesDto })
  timeSeries: InvestmentDashboardTimeSeriesDto;

  @ApiProperty({ type: [InvestmentDashboardCategoryPerformanceRowDto] })
  categoryPerformance: InvestmentDashboardCategoryPerformanceRowDto[];

  @ApiProperty({ type: [InvestmentDashboardCategoryPerformanceRowDto] })
  categorySubPerformance: InvestmentDashboardCategoryPerformanceRowDto[];
}

export class InvestmentDashboardAnalyticsResponseDto {
  @ApiProperty({ type: InvestmentDashboardSummaryDto })
  summary: InvestmentDashboardSummaryDto;

  @ApiProperty({ type: InvestmentDashboardUpcomingDto })
  upcoming: InvestmentDashboardUpcomingDto;

  @ApiProperty({ type: InvestmentDashboardAnalyticsDto })
  analytics: InvestmentDashboardAnalyticsDto;
}