import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvestmentContributionPlanDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceAccountId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  cadenceUnit: string;

  @ApiProperty()
  @IsInt()
  cadenceInterval: number;

  @ApiProperty()
  @IsDateString()
  anchorDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  reminderDaysBefore?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  autoCreateEvent?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}