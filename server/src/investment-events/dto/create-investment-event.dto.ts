import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInvestmentEventDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedTransactionId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  eventType: string;

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