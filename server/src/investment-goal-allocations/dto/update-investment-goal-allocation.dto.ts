import { PartialType } from '@nestjs/swagger';
import { CreateInvestmentGoalAllocationDto } from './create-investment-goal-allocation.dto';

export class UpdateInvestmentGoalAllocationDto extends PartialType(CreateInvestmentGoalAllocationDto) {}