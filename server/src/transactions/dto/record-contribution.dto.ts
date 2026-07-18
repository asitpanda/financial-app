import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordContributionDto {
  @ApiProperty({ description: 'Investment id' })
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty({ description: 'Contribution plan id', required: false })
  @IsOptional()
  @IsString()
  contributionPlanId?: string;

  @ApiProperty({ description: 'Source account id or bank/account name' })
  @IsNotEmpty()
  @IsString()
  sourceAccountId: string;

  @ApiProperty({ description: 'Contribution amount' })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Transaction date (YYYY-MM-DD)' })
  @IsDateString()
  transactionDate: string;

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
