import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PreviewRecurringContributionPlanDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  investmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceAccountId?: string;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @IsString()
  @IsIn(['day', 'week', 'month', 'quarter', 'year'])
  cadenceUnit: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  cadenceInterval: number;

  @ApiProperty()
  @IsDateString()
  anchorDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: ['OPENING_BALANCE', 'TRACK_FROM_TODAY'] })
  @IsString()
  @IsIn(['OPENING_BALANCE', 'TRACK_FROM_TODAY'])
  historicalImportMode: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  autoCreateEvent?: boolean;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingPrincipalAmount?: number;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingIncomeAmount?: number;
}
