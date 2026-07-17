import { Inject, Injectable } from '@nestjs/common';
import { MockInvestmentContributionPlanRepository } from '../investment-contribution-plans/repositories/mock-investment-contribution-plan.repository';
import { MockValuationSnapshotRepository } from '../valuation-snapshots/repositories/mock-valuation-snapshot.repository';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { IInvestmentRepository } from './repositories/investment.repository.interface';

@Injectable()
export class InvestmentsService {
  constructor(
    @Inject('INVESTMENT_REPOSITORY')
    private readonly repository: IInvestmentRepository,
    private readonly contributionPlanRepository: MockInvestmentContributionPlanRepository,
    private readonly valuationSnapshotRepository: MockValuationSnapshotRepository,
  ) {}

  async create(createInvestmentDto: CreateInvestmentDto, userId: number) {
    return this.repository.create(createInvestmentDto, userId);
  }

  async findAll(userId: number) {
    const investments = await this.repository.findAll(userId);
    const allPlans = await Promise.all(
      investments.map((inv) => this.contributionPlanRepository.findAllByInvestment(String(inv.id))),
    );
    const allSnapshots = await Promise.all(
      investments.map((inv) => this.valuationSnapshotRepository.findAllByInvestment(String(inv.id))),
    );
    return investments.map((inv, i) => {
      const activePlan = allPlans[i].find((p) => p.status === 'active') ?? null;
      return {
        ...inv,
        activeContributionPlan: activePlan
          ? {
              amount: activePlan.amount,
              cadenceUnit: activePlan.cadenceUnit,
              cadenceInterval: activePlan.cadenceInterval,
              nextDueDate: activePlan.nextDueDate,
            }
          : null,
        valuationSnapshots: allSnapshots[i],
      };
    });
  }

  async findOne(id: number, userId: number) {
    const investment = await this.repository.findOne(id, userId);
    if (!investment) return null;

    const activePlan = (await this.contributionPlanRepository.findAllByInvestment(String(investment.id)))
      .find((p) => p.status === 'active') ?? null;
    const valuationSnapshots = await this.valuationSnapshotRepository.findAllByInvestment(String(investment.id));

    return {
      ...investment,
      activeContributionPlan: activePlan
        ? {
            amount: activePlan.amount,
            cadenceUnit: activePlan.cadenceUnit,
            cadenceInterval: activePlan.cadenceInterval,
            nextDueDate: activePlan.nextDueDate,
          }
        : null,
      valuationSnapshots,
    };
  }

  async update(id: number, updateInvestmentDto: UpdateInvestmentDto, userId: number) {
    return this.repository.update(id, updateInvestmentDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}