import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvestmentActiveContributionPlanResponseDto } from './investment-detail-response.dto';
import { PaginationMetaDto } from '../../common/listing/pagination-meta.dto';

export class InvestmentSummaryResponseDto {
  @ApiProperty()
  id: number;

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

  @ApiProperty()
  currentValue: number;

  @ApiProperty()
  gainLossAmount: number;

  @ApiPropertyOptional({ nullable: true })
  gainLossPercentage?: number | null;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  currency?: string;

  @ApiPropertyOptional()
  maturityDate?: string | null;

  @ApiPropertyOptional()
  lastValuationAt?: string | null;

  @ApiPropertyOptional()
  currentValueSource?: string | null;

  @ApiPropertyOptional({ type: InvestmentActiveContributionPlanResponseDto, nullable: true })
  activeContributionPlan?: InvestmentActiveContributionPlanResponseDto | null;
}

export class InvestmentSummaryPageResponseDto {
  @ApiProperty({ type: [InvestmentSummaryResponseDto] })
  data: InvestmentSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination: PaginationMetaDto;
}