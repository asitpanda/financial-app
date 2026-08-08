import { ApiProperty } from '@nestjs/swagger';
import { InvestmentEventType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class HistoricalContributionItemDto {
  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  selected: boolean;

  @ApiProperty({ enum: ['EXPECTED', 'PENDING', 'CONFIRMED', 'SKIPPED', 'FAILED', 'CANCELLED'], required: false })
  @IsOptional()
  @IsIn(['EXPECTED', 'PENDING', 'CONFIRMED', 'SKIPPED', 'FAILED', 'CANCELLED'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiProperty({ required: false, enum: InvestmentEventType })
  @IsOptional()
  @IsString()
  @IsEnum(InvestmentEventType)
  eventType?: InvestmentEventType;

  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sequenceNumber?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
