import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Transaction type', enum: ['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'])
  type: TransactionType;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Transaction category id', required: false, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;

  @ApiProperty({ description: 'Category label snapshot', required: false, nullable: true })
  @IsOptional()
  @IsString()
  categoryLabelSnapshot?: string | null;

  @ApiProperty({ description: 'Source account id', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceAccountId?: number | null;

  @ApiProperty({ description: 'Destination account id', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  destinationAccountId?: number | null;

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
