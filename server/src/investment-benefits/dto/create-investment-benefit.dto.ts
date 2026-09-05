import { ApiProperty } from '@nestjs/swagger';
import { InvestmentBenefitType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvestmentBenefitDto {
  @ApiProperty({ enum: InvestmentBenefitType })
  @IsNotEmpty()
  @IsEnum(InvestmentBenefitType)
  benefitType: InvestmentBenefitType;

  @ApiProperty({ minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  benefitDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}