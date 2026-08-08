import { Injectable } from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { ValuationSnapshotsService } from '../valuation-snapshots/valuation-snapshots.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentRepository } from './repositories/investment.repository';

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly repository: InvestmentRepository,
    private readonly contributionPlansService: InvestmentContributionPlansService,
    private readonly investmentEventsService: InvestmentEventsService,
    private readonly valuationSnapshotsService: ValuationSnapshotsService,
  ) {}

  async create(createInvestmentDto: CreateInvestmentDto, userId: number) {
    return this.repository.create(createInvestmentDto, userId);
  }

  private mapActiveContributionPlan(activePlan: any) {
    if (!activePlan) {
      return null;
    }

    return {
      id: activePlan.id,
      amount: activePlan.amount,
      cadenceUnit: activePlan.cadenceUnit,
      cadenceInterval: activePlan.cadenceInterval,
      historicalImportMode: activePlan.historicalImportMode,
      anchorDate: activePlan.anchorDate,
      nextDueDate: activePlan.nextDueDate,
      endDate: activePlan.endDate,
      status: activePlan.status,
    };
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

  private buildPerformanceHistoryFromSnapshots(
    investment: any,
    snapshots: any[] = [],
  ) {
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return [];
    }

    const investedValue = Number(investment?.totalInvested ?? 0);

    return [...snapshots]
      .filter((snapshot) => snapshot?.snapshotDate)
      .sort(
        (left, right) =>
          new Date(left.snapshotDate).getTime() -
          new Date(right.snapshotDate).getTime(),
      )
      .map((snapshot) => {
        const currentValue = Number(snapshot.marketValue ?? 0);
        const gainLossValue = currentValue - investedValue;
        const gainLossPercentage =
          investedValue > 0 ? (gainLossValue / investedValue) * 100 : 0;

        return {
          date: snapshot.snapshotDate,
          currentValue,
          investedValue,
          gainLossValue,
          gainLossPercentage,
          source: 'valuation_snapshot',
        };
      });
  }

  private normalizeEventStatus(value: unknown) {
    return String(value || '').trim().toUpperCase();
  }

  private buildPerformanceHistoryFromEvents(events: any[] = []) {
    const confirmedEvents = events
      .filter(
        (event) => this.normalizeEventStatus(event?.status) === 'CONFIRMED',
      )
      .sort(
        (left, right) =>
          new Date(left.eventDate || left.dueDate || 0).getTime() -
          new Date(right.eventDate || right.dueDate || 0).getTime(),
      );

    if (confirmedEvents.length === 0) {
      return [];
    }

    let investedValue = 0;
    let currentValue = 0;

    return confirmedEvents.reduce((history, event) => {
      const amount = Number(event?.amount || 0);
      const eventDate = event?.eventDate || event?.dueDate;

      if (!eventDate) {
        return history;
      }

      if (
        event?.eventType === InvestmentEventType.CONTRIBUTION ||
        event?.eventType === InvestmentEventType.OPENING_BALANCE
      ) {
        investedValue += amount;
        currentValue += amount;
      } else if (
        event?.eventType === InvestmentEventType.WITHDRAWAL_PRINCIPAL
      ) {
        investedValue -= amount;
        currentValue -= amount;
      } else if (
        event?.eventType === InvestmentEventType.OPENING_INCOME_CREDIT
      ) {
        currentValue += amount;
      } else {
        return history;
      }

      const gainLossValue = currentValue - investedValue;
      const gainLossPercentage =
        investedValue > 0 ? (gainLossValue / investedValue) * 100 : 0;

      history.push({
        date: eventDate,
        currentValue,
        investedValue,
        gainLossValue,
        gainLossPercentage,
        source: 'investment_event',
        eventType: event?.eventType ?? null,
      });

      return history;
    }, [] as any[]);
  }

  private buildDerivedEventValuation(events: any[] = []) {
    const confirmedEvents = events.filter(
      (event) => this.normalizeEventStatus(event?.status) === 'CONFIRMED',
    );

    if (confirmedEvents.length === 0) {
      return null;
    }

    const principalIn = confirmedEvents
      .filter((event) => {
        const eventType = event?.eventType;
        return eventType === InvestmentEventType.CONTRIBUTION || eventType === InvestmentEventType.OPENING_BALANCE;
      })
      .reduce((sum, event) => sum + Number(event?.amount || 0), 0);

    const principalOut = confirmedEvents
      .filter(
        (event) =>
          event?.eventType === InvestmentEventType.WITHDRAWAL_PRINCIPAL,
      )
      .reduce((sum, event) => sum + Number(event?.amount || 0), 0);

    const historicalIncome = confirmedEvents
      .filter(
        (event) =>
          event?.eventType === InvestmentEventType.OPENING_INCOME_CREDIT,
      )
      .reduce((sum, event) => sum + Number(event?.amount || 0), 0);

    const latestConfirmedEvent = confirmedEvents
      .filter((event) => event?.eventDate)
      .sort(
        (left, right) =>
          new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime(),
      )[0] ?? null;

    const totalInvested = principalIn - principalOut;

    return {
      totalInvested,
      currentValue: totalInvested + historicalIncome,
      lastValuationAt: latestConfirmedEvent?.eventDate ?? null,
      currentValueSource: 'manual',
    };
  }

  private mergeDerivedValuation(investment: any, snapshots: any[] = [], events: any[] = []) {
    const latestSnapshot = this.getLatestSnapshot(snapshots);
    if (!latestSnapshot) {
      const derivedEventValuation = this.buildDerivedEventValuation(events);
      const performanceHistory = this.buildPerformanceHistoryFromEvents(events);

      return {
        ...investment,
        ...(derivedEventValuation || {}),
        performanceHistory,
        performanceHistorySource:
          performanceHistory.length > 0 ? 'investment_event' : 'none',
        valuationSnapshots: snapshots,
      };
    }

    return {
      ...investment,
      currentValue: Number(latestSnapshot.marketValue ?? investment.currentValue ?? 0),
      lastValuationAt: latestSnapshot.snapshotDate ?? investment.lastValuationAt,
      currentValueSource: 'valuation_snapshot',
      performanceHistory: this.buildPerformanceHistoryFromSnapshots(
        investment,
        snapshots,
      ),
      performanceHistorySource: 'valuation_snapshot',
      valuationSnapshots: snapshots,
    };
  }

  async findAll(userId: number) {
    const investments = await this.repository.findAll(userId);
    const activePlans = await this.contributionPlansService.findAllActiveByUser(
      userId,
    );
    const activePlanByInvestmentId = new Map(
      activePlans.map((plan) => [String(plan.investmentId), plan]),
    );

    return investments.map((investment) => ({
      ...investment,
      activeContributionPlan: this.mapActiveContributionPlan(
        activePlanByInvestmentId.get(String(investment.id)) ?? null,
      ),
    }));
  }

  async findOne(id: number, userId: number) {
    const investment = await this.repository.findOne(id, userId);
    if (!investment) return null;

    const activePlan =
      (await this.contributionPlansService.findAllByInvestment(
        String(investment.id),
      )).find((p) => p.status === 'active') ?? null;
    const investmentEvents = await this.investmentEventsService.findAllByInvestment(String(investment.id));
    const valuationSnapshots = await this.valuationSnapshotsService.findAllByInvestment(String(investment.id));

    return this.mergeDerivedValuation({
      ...investment,
      investmentEvents,
      activeContributionPlan: this.mapActiveContributionPlan(activePlan),
    }, valuationSnapshots, investmentEvents);
  }

  async update(id: number, updateInvestmentDto: UpdateInvestmentDto, userId: number) {
    return this.repository.update(id, updateInvestmentDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}