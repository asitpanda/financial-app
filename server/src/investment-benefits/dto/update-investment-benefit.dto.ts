import { PartialType } from '@nestjs/swagger';
import { CreateInvestmentBenefitDto } from './create-investment-benefit.dto';
import { InvestmentBenefitStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateInvestmentBenefitDto extends PartialType(CreateInvestmentBenefitDto) {
  @IsOptional()
  @IsEnum(InvestmentBenefitStatus)
  status?: InvestmentBenefitStatus;
}