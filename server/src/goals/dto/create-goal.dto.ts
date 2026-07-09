import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ description: 'Goal name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Goal category id' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @ApiProperty({ description: 'Category label snapshot' })
  @IsNotEmpty()
  @IsString()
  categoryLabelSnapshot: string;

  @ApiProperty({ description: 'Goal description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Target amount' })
  @IsNotEmpty()
  @IsNumber()
  targetAmount: number;

  @ApiProperty({ description: 'Goal icon key', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Current amount', required: false })
  @IsOptional()
  @IsNumber()
  currentAmount?: number;

  @ApiProperty({ description: 'Deadline', required: false })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
