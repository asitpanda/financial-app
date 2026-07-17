import { PartialType } from '@nestjs/swagger';
import { CreateInvestmentContributionPlanDto } from './create-investment-contribution-plan.dto';

export class UpdateInvestmentContributionPlanDto extends PartialType(CreateInvestmentContributionPlanDto) {}