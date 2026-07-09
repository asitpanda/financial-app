import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Transaction type', enum: ['income', 'expense'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['income', 'expense'])
  type: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Transaction category id' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @ApiProperty({ description: 'Category label snapshot' })
  @IsNotEmpty()
  @IsString()
  categoryLabelSnapshot: string;

  @ApiProperty({ description: 'Source account id', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceAccountId?: number;

  @ApiProperty({ description: 'Destination account id', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  destinationAccountId?: number;

  @ApiProperty({ description: 'Linked investment event id', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  linkedInvestmentEventId?: number;

  @ApiProperty({ description: 'Transaction kind' })
  @IsNotEmpty()
  @IsString()
  transactionKind: string;

  @ApiProperty({ description: 'Transaction date' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Linked goal id', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  goalId?: number;
}
