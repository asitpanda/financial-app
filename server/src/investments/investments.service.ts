import { Injectable } from '@nestjs/common';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { ValuationSnapshotsService } from '../valuation-snapshots/valuation-snapshots.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentRepository } from './repositories/investment.repository';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly repository: InvestmentRepository,
    private readonly contributionPlansService: InvestmentContributionPlansService,
    private readonly valuationSnapshotsService: ValuationSnapshotsService,
  ) {}

  async create(createInvestmentDto: CreateInvestmentDto, userId: number) {
    return this.repository.create(createInvestmentDto, userId);
  }

  private getLatestSnapshot(snapshots: any[] = []) {
    return snapshots
      .filter((snapshot) => snapshot?.snapshotDate)
      .sort(
        (left, right) =>
          new Date(right.snapshotDate).getTime() -
          new Date(left.snapshotDate).getTime(),
      )[0] ?? null;
  }

  private mergeDerivedValuation(investment: any, snapshots: any[] = []) {
    const latestSnapshot = this.getLatestSnapshot(snapshots);
    if (!latestSnapshot) {
      return {
        ...investment,
        valuationSnapshots: snapshots,
      };
    }

    return {
      ...investment,
      currentValue: Number(latestSnapshot.marketValue ?? investment.currentValue ?? 0),
      lastValuationAt: latestSnapshot.snapshotDate ?? investment.lastValuationAt,
      currentValueSource: 'valuation_snapshot',
      valuationSnapshots: snapshots,
    };
  }

  async findAll(userId: number) {
    const investments = await this.repository.findAll(userId);
    const allPlans = await Promise.all(
      investments.map((inv) => this.contributionPlansService.findAllByInvestment(String(inv.id))),
    );
    const allSnapshots = await Promise.all(
      investments.map((inv) => this.valuationSnapshotsService.findAllByInvestment(String(inv.id))),
    );
    return investments.map((inv, i) => {
      const activePlan = allPlans[i].find((p) => p.status === 'active') ?? null;
      return this.mergeDerivedValuation({
        ...inv,
        activeContributionPlan: activePlan
          ? {
              id: activePlan.id,
              amount: activePlan.amount,
              cadenceUnit: activePlan.cadenceUnit,
              cadenceInterval: activePlan.cadenceInterval,
              historicalImportMode: activePlan.historicalImportMode,
              anchorDate: activePlan.anchorDate,
              nextDueDate: activePlan.nextDueDate,
              endDate: activePlan.endDate,
              status: activePlan.status,
            }
          : null,
      }, allSnapshots[i]);
    });
  }

  async findOne(id: number, userId: number) {
    const investment = await this.repository.findOne(id, userId);
    if (!investment) return null;

    const activePlan = (await this.contributionPlansService.findAllByInvestment(String(investment.id)))
      .find((p) => p.status === 'active') ?? null;
    const valuationSnapshots = await this.valuationSnapshotsService.findAllByInvestment(String(investment.id));

    return this.mergeDerivedValuation({
      ...investment,
      activeContributionPlan: activePlan
        ? {
            id: activePlan.id,
            amount: activePlan.amount,
            cadenceUnit: activePlan.cadenceUnit,
            cadenceInterval: activePlan.cadenceInterval,
            historicalImportMode: activePlan.historicalImportMode,
            anchorDate: activePlan.anchorDate,
            nextDueDate: activePlan.nextDueDate,
            endDate: activePlan.endDate,
            status: activePlan.status,
          }
        : null,
    }, valuationSnapshots);
  }

  async update(id: number, updateInvestmentDto: UpdateInvestmentDto, userId: number) {
    return this.repository.update(id, updateInvestmentDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}