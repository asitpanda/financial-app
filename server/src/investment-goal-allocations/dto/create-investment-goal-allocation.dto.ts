import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvestmentGoalAllocationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  goalId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  allocationType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  allocationPercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  allocationAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}