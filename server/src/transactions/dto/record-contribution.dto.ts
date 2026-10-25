import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class RecordContributionDto {
  @ApiProperty({ required: false, description: 'Stable identity for retries of the same activity' })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiProperty({ description: 'Investment id' })
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty({ description: 'Contribution plan id', required: false })
  @IsOptional()
  @IsString()
  contributionPlanId?: string;

  @ApiProperty({ description: 'Contribution amount' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Transaction date (YYYY-MM-DD)' })
  @IsDateString()
  transactionDate: string;

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
