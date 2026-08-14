import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvestmentActiveContributionPlanResponseDto {
  @ApiProperty()
  id: string | number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  cadenceUnit: string;

  @ApiProperty()
  cadenceInterval: number;

  @ApiPropertyOptional()
  historicalImportMode?: string;

  @ApiPropertyOptional()
  anchorDate?: string | null;

  @ApiPropertyOptional()
  nextDueDate?: string | null;

  @ApiPropertyOptional()
  endDate?: string | null;

  @ApiPropertyOptional()
  status?: string;
}

export class InvestmentLatestSnapshotResponseDto {
  @ApiProperty()
  id: string | number;

  @ApiProperty()
  snapshotDate: string;

  @ApiProperty()
  marketValue: number;

  @ApiPropertyOptional()
  units?: number | null;

  @ApiPropertyOptional()
  price?: number | null;

  @ApiPropertyOptional()
  source?: string | null;
}

export class InvestmentDetailResponseDto {
  @ApiProperty()
  id: string | number;

  @ApiPropertyOptional()
  accountId?: number | null;

  @ApiPropertyOptional()
  assetTaxonomyId?: string | number | null;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  assetType?: string;

  @ApiPropertyOptional()
  assetCategory?: string;

  @ApiPropertyOptional()
  institutionName?: string | null;

  @ApiProperty()
  totalInvested: number;

  @ApiPropertyOptional()
  currentValue?: number;

  @ApiPropertyOptional()
  startDate?: string | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  maturityDate?: string | null;

  @ApiPropertyOptional()
  currency?: string;

  @ApiPropertyOptional()
  contributionMode?: string;

  @ApiPropertyOptional()
  currentValueSource?: string | null;

  @ApiPropertyOptional()
  lastValuationAt?: string | null;

  @ApiPropertyOptional()
  insuranceCover?: number;

  @ApiPropertyOptional()
  referenceNumber?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({ type: InvestmentActiveContributionPlanResponseDto, nullable: true })
  activeContributionPlan?: InvestmentActiveContributionPlanResponseDto | null;

  @ApiProperty()
  eventCount: number;

  @ApiProperty()
  snapshotCount: number;

  @ApiPropertyOptional({ type: InvestmentLatestSnapshotResponseDto, nullable: true })
  latestSnapshot?: InvestmentLatestSnapshotResponseDto | null;

  @ApiPropertyOptional()
  createdAt?: string;

  @ApiPropertyOptional()
  updatedAt?: string;
}