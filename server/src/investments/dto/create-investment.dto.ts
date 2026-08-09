import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsDefined, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export const INVESTMENT_STATUS_VALUES = ['active', 'matured', 'closed'] as const;

export class CreateInvestmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assetType: string;

  @ApiProperty()
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  holdingMode?: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contributionMode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  documentsMeta?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}