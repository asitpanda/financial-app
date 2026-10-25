import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvestmentBenefitType, InvestmentEventType, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';

export class BenefitRealizationTransactionDto {
  @ApiPropertyOptional({ enum: TransactionType, default: TransactionType.INVESTMENT })
  @IsOptional() @IsEnum(TransactionType) type?: TransactionType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sourceAccountId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() destinationAccountId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() categoryId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() goalId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class InvestmentBenefitRealizationComponentDto {
  @ApiProperty({ enum: InvestmentEventType })
  @IsEnum(InvestmentEventType)
  eventType: InvestmentEventType;
  @ApiProperty()
  @IsNumber() @IsPositive()
  amount: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() eventDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: BenefitRealizationTransactionDto })
  @IsOptional() @IsObject() @ValidateNested() @Type(() => BenefitRealizationTransactionDto)
  transaction?: BenefitRealizationTransactionDto;
}

export class RealizeInvestmentBenefitDto {
  @ApiProperty({ type: [InvestmentBenefitRealizationComponentDto] })
  @ValidateNested({ each: true }) @Type(() => InvestmentBenefitRealizationComponentDto)
  components: InvestmentBenefitRealizationComponentDto[];
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional() @IsNumber() @IsPositive()
  benefitAmount?: number;
  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  benefitDate?: string;
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  destinationAccountId?: number | null;
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() closesInvestment?: boolean;
}

export class QuickRealizeInvestmentBenefitDto extends InvestmentBenefitRealizationComponentDto {
  @ApiProperty({ enum: InvestmentBenefitType })
  @IsEnum(InvestmentBenefitType)
  benefitType: InvestmentBenefitType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() benefitDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() benefitNotes?: string;
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  destinationAccountId?: number | null;
  @ApiPropertyOptional({ default: false }) @IsOptional() closesInvestment?: boolean;
}