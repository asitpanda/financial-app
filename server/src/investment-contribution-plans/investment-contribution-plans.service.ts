import { Inject, Injectable } from '@nestjs/common';
import { CreateInvestmentContributionPlanDto } from './dto/create-investment-contribution-plan.dto';
import { UpdateInvestmentContributionPlanDto } from './dto/update-investment-contribution-plan.dto';
import { IInvestmentContributionPlanRepository } from './repositories/investment-contribution-plan.repository.interface';

@Injectable()
export class InvestmentContributionPlansService {
  constructor(
    @Inject('INVESTMENT_CONTRIBUTION_PLAN_REPOSITORY')
    private readonly repository: IInvestmentContributionPlanRepository,
  ) {}

  async create(createDto: CreateInvestmentContributionPlanDto) {
    return this.repository.create(createDto);
  }

  async findAllByInvestment(investmentId: string) {
    return this.repository.findAllByInvestment(investmentId);
  }

  async findOne(id: string) {
    return this.repository.findOne(id);
  }

  async update(id: string, updateDto: UpdateInvestmentContributionPlanDto) {
    return this.repository.update(id, updateDto);
  }

  async remove(id: string) {
    return this.repository.delete(id);
  }

  async advanceNextDueDate(id: number) {
    // Get the current plan
    const plan = await this.repository.findOne(String(id));
    if (!plan) return null;

    // Calculate next due date based on cadence
    const nextDueDateObj = new Date(plan.nextDueDate);
    
    if (plan.cadenceUnit === 'month') {
      nextDueDateObj.setMonth(nextDueDateObj.getMonth() + plan.cadenceInterval);
    } else if (plan.cadenceUnit === 'year') {
      nextDueDateObj.setFullYear(nextDueDateObj.getFullYear() + plan.cadenceInterval);
    } else if (plan.cadenceUnit === 'week') {
      nextDueDateObj.setDate(nextDueDateObj.getDate() + (plan.cadenceInterval * 7));
    } else if (plan.cadenceUnit === 'day') {
      nextDueDateObj.setDate(nextDueDateObj.getDate() + plan.cadenceInterval);
    }

    // Update the plan
    const updateDto: UpdateInvestmentContributionPlanDto = {
      nextDueDate: nextDueDateObj.toISOString().split('T')[0],
    };

    return this.repository.update(String(id), updateDto);
  }
}