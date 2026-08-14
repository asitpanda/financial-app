import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsDefined, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const INVESTMENT_STATUS_VALUES = ['active', 'matured', 'closed'] as const;
export const INVESTMENT_CONTRIBUTION_MODE_VALUES = ['ONE_TIME', 'RECURRING'] as const;

export class CreateInvestmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  assetType: string;

  @ApiProperty()
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  assetCategory: string;

  @ApiProperty()
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assetTaxonomyId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  institutionName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty()
  @IsString()
  @IsIn(INVESTMENT_STATUS_VALUES)
  status: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalInvested: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currentValueSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  lastValuationAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insuranceCover?: number;

  @ApiProperty({ enum: INVESTMENT_CONTRIBUTION_MODE_VALUES })
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsDefined()
  @IsString()
  @IsIn(INVESTMENT_CONTRIBUTION_MODE_VALUES)
  contributionMode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}