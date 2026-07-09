import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInvestmentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  assetType: string;

  @ApiProperty()
  @IsString()
  assetCategory: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  accountId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assetTaxonomyId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  holdingMode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsNumber()
  totalInvested: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
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
  @IsNumber()
  insuranceCover?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  documentsMeta?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}