import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvestmentPerformanceHistoryPointResponseDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  currentValue: number;

  @ApiProperty()
  investedValue: number;

  @ApiProperty()
  gainLossValue: number;

  @ApiProperty()
  gainLossPercentage: number;

  @ApiPropertyOptional()
  source?: string | null;

  @ApiPropertyOptional()
  eventType?: string | null;
}

export class InvestmentPerformanceResponseDto {
  @ApiProperty()
  investmentId: string | number;

  @ApiProperty({ nullable: true })
  performanceHistorySource: string | null;

  @ApiProperty({ type: [InvestmentPerformanceHistoryPointResponseDto] })
  performanceHistory: InvestmentPerformanceHistoryPointResponseDto[];
}