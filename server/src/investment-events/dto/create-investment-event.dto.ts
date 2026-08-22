import { ApiProperty } from '@nestjs/swagger';
import { InvestmentEventType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInvestmentEventDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recurringPlanId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedTransactionId?: string;

  @ApiProperty({ enum: InvestmentEventType })
  @IsNotEmpty()
  @IsString()
  @IsEnum(InvestmentEventType)
  eventType: InvestmentEventType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  eventSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sequenceNumber?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  eventDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  units?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pricePerUnit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  netAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}