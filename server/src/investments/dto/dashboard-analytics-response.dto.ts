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

  // INSURANCE_SAVINGS products with known current value (e.g., surrender value, policy value)
  @ApiProperty()
  insuranceSavingsWithValueCount: number;

  @ApiProperty()
  insuranceSavingsWithValueValue: number;

  // INSURANCE_SAVINGS products without known current value (e.g., immature policies, awaiting statement)
  // These are NOT flagged as stale - they lack value by design, not due to missing updates
  @ApiProperty()
  insuranceSavingsWithoutValueCount: number;

  @ApiProperty({ type: [String] })
  snapshotBackedIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  estimatedIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  investedOnlyIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  staleValuationIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  insuranceSavingsWithValueIds: Array<string | number>;

  @ApiProperty({ type: [String] })
  insuranceSavingsWithoutValueIds: Array<string | number>;
}

export class InvestmentDashboardSummaryDto {
  @ApiProperty()
  totalInvestments: number;

  // Total long-term capital committed: INVESTMENT + INSURANCE_SAVINGS contributions.
  @ApiProperty()
  totalContributions: number;

  // The following totals only include products with accountingTreatment === INVESTMENT.
  @ApiProperty()
  totalInvested: number;

  @ApiProperty()
  totalCurrentValue: number;

  @ApiProperty()
  totalReturn: number;

  @ApiProperty()
  returnPercentage: number;

  // Current value from INSURANCE_SAVINGS products that have a meaningful current value.
  @ApiProperty()
  totalCurrentValueFromInsuranceSavings: number;

  // Upcoming maturity within 90 days: INVESTMENT maturity only.
  @ApiProperty()
  upcomingMaturity: number;

  // Upcoming maturity/benefits within 90 days: INSURANCE_SAVINGS maturity benefits only.
  @ApiProperty()
  upcomingMaturityFromInsuranceSavings: number;

  // Total insurance cover: both INSURANCE_SAVINGS and PROTECTION_EXPENSE.
  @ApiProperty()
  insuranceCover: number;

  // Insurance cover from PROTECTION_EXPENSE products.
  @ApiProperty()
  insuranceCoverProtection: number;

  // Insurance cover from INSURANCE_SAVINGS products.
  @ApiProperty()
  insuranceCoverSavings: number;

  // Cumulative premium/contribution paid toward INSURANCE_SAVINGS products - not blended into totalInvested/totalReturn.
  @ApiProperty()
  insuranceSavingsContribution: number;

  // Cumulative premium paid toward PROTECTION_EXPENSE products - reported as expense, excluded from portfolio value entirely.
  @ApiProperty()
  protectionExpenseTotal: number;

  @ApiProperty({ type: InvestmentValueSourceSummaryDto })
  valueSourceSummary: InvestmentValueSourceSummaryDto;
}