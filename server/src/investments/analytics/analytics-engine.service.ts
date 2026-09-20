import { Injectable } from '@nestjs/common';
import type { InvestmentEventType } from '@prisma/client';
import { InvestmentEventsService } from '../../investment-events/investment-events.service';
import { ValuationSnapshotsService } from '../../valuation-snapshots/valuation-snapshots.service';
import type { EventLike, SnapshotLike, SummaryInvestment } from '../investment.types';
import { generatePeriods } from './period-generator';
import { ACTIVITY_EVENT_TYPES, type AnalyticsFacts, type AnalyticsPoint, type AnalyticsQuery } from './analytics.types';

@Injectable()
export class AnalyticsEngineService {
  constructor(
    private readonly investmentEventsService: InvestmentEventsService,
    private readonly valuationSnapshotsService: ValuationSnapshotsService,
  ) {}

  async calculate(query: AnalyticsQuery, facts: AnalyticsFacts): Promise<AnalyticsPoint[]> {
    const confirmedEvents = facts.events.filter((event) => String(event.status ?? '').toUpperCase() === 'CONFIRMED' && event.eventDate);
    const dates = [
      ...confirmedEvents.map((event) => new Date(event.eventDate as Date)),
      ...facts.snapshots.filter((snapshot) => snapshot.snapshotDate).map((snapshot) => new Date(snapshot.snapshotDate as Date)),
      ...facts.investments.filter((investment) => investment.startDate).map((investment) => new Date(investment.startDate as Date)),
    ];
    const periods = generatePeriods(dates, query);
    let cumulativeInvested = 0;
    let cumulativeWithdrawn = 0;
    let previousPortfolioValue: number | null = null;
    return periods.map((period, periodIndex) => {
      const periodEvents = confirmedEvents.filter((event) => {
        const eventDate = new Date(event.eventDate as Date).getTime();
        const nextPeriod = periods[periodIndex + 1];
        const periodEnd = nextPeriod?.startDate.getTime() ?? period.endDate.getTime() + 1;
        return eventDate >= period.startDate.getTime() && eventDate < periodEnd && ACTIVITY_EVENT_TYPES.has(event.eventType as InvestmentEventType);
      });
      const amount = (event: EventLike) => Number(event.amount ?? 0);
      const newContribution = periodEvents.filter((event) => event.eventType === 'CONTRIBUTION' || event.eventType === 'OPENING_BALANCE').reduce((sum, event) => sum + amount(event), 0);
      const newWithdrawal = periodEvents.filter((event) => event.eventType === 'WITHDRAWAL_PRINCIPAL').reduce((sum, event) => sum + amount(event), 0);
      const newPremium = periodEvents.filter((event) => event.eventType === 'PREMIUM').reduce((sum, event) => sum + amount(event), 0);
      const newIncomeCredit = periodEvents.filter((event) => event.eventType === 'INCOME_CREDIT' || event.eventType === 'OPENING_INCOME_CREDIT').reduce((sum, event) => sum + amount(event), 0);
      cumulativeInvested += newContribution;
      cumulativeWithdrawn += newWithdrawal;
      const resolvedPortfolioValue = this.resolvePortfolioValue(period.endDate, facts);
      const portfolioValue = resolvedPortfolioValue ?? 0;
      const portfolioValueQuality = this.resolvePortfolioValueQuality(period.endDate, facts, resolvedPortfolioValue, previousPortfolioValue);
      previousPortfolioValue = portfolioValue;
      const invested = cumulativeInvested - cumulativeWithdrawn;
      return {
        period,
        activity: { newContribution, newWithdrawal, newPremium, newIncomeCredit, netCashFlow: newContribution + newPremium + newIncomeCredit - newWithdrawal },
        state: { cumulativeInvested: invested, cumulativeWithdrawn, portfolioValue, returnAmount: portfolioValue - invested },
        dataQuality: { cashFlow: 'complete' as const, portfolioValue: portfolioValueQuality },
      };
    });
  }

  async loadFacts(userId: number, investments: AnalyticsFacts['investments']): Promise<AnalyticsFacts> {
    const [events, snapshots] = await Promise.all([this.investmentEventsService.findAll(userId), this.valuationSnapshotsService.findAll(userId)]);
    return { investments, events, snapshots };
  }

  resolveInvestmentValueAtDate(
    investment: SummaryInvestment,
    snapshots: SnapshotLike[] = [],
    pointDate: Date,
    events: EventLike[] = [],
  ) {
    const latestSnapshot = [...snapshots]
      .filter((snapshot) => snapshot.snapshotDate && new Date(snapshot.snapshotDate).getTime() <= pointDate.getTime())
      .sort((left, right) => new Date(right.snapshotDate as Date).getTime() - new Date(left.snapshotDate as Date).getTime())[0];

    if (latestSnapshot) {
      return { value: Number(latestSnapshot.marketValue ?? 0), source: 'snapshot' as const };
    }

    const derivedValuation = this.deriveEventValuation(
      events.filter((event) => event.eventDate && new Date(event.eventDate).getTime() <= pointDate.getTime()),
      investment.accountingTreatment,
    );
    if (derivedValuation) {
      return { value: derivedValuation.currentValue, source: derivedValuation.currentValueSource ?? 'estimated' as const };
    }

    return { value: 0, source: 'invested' as const };
  }

  deriveEventValuation(events: EventLike[] = [], accountingTreatment: SummaryInvestment['accountingTreatment'] = 'INVESTMENT') {
    const confirmedEvents = events.filter((event) => String(event.status ?? '').toUpperCase() === 'CONFIRMED');
    if (confirmedEvents.length === 0 || accountingTreatment === 'PROTECTION_EXPENSE') return null;

    const principalIn = confirmedEvents
      .filter((event) => event.eventType === 'CONTRIBUTION' || event.eventType === 'OPENING_BALANCE' || (accountingTreatment === 'INSURANCE_SAVINGS' && event.eventType === 'PREMIUM'))
      .reduce((sum, event) => sum + Number(event.amount ?? 0), 0);
    const principalOut = confirmedEvents
      .filter((event) => event.eventType === 'WITHDRAWAL_PRINCIPAL')
      .reduce((sum, event) => sum + Number(event.amount ?? 0), 0);
    const incomeCredits = confirmedEvents
      .filter((event) => event.eventType === 'INCOME_CREDIT' || event.eventType === 'OPENING_INCOME_CREDIT')
      .reduce((sum, event) => sum + Number(event.amount ?? 0), 0);

    if (accountingTreatment === 'INSURANCE_SAVINGS') {
      return {
        totalInvested: principalIn,
        currentValue: principalIn,
        currentValueSource: 'manual' as const,
        lastValuationAt: confirmedEvents
          .filter((event) => event.eventDate)
          .sort((left, right) => new Date(right.eventDate as Date).getTime() - new Date(left.eventDate as Date).getTime())[0]?.eventDate ?? null,
      };
    }

    return {
      totalInvested: principalIn - principalOut,
      currentValue: principalIn - principalOut + incomeCredits,
      currentValueSource: 'manual' as const,
      lastValuationAt: confirmedEvents
        .filter((event) => event.eventDate)
        .sort((left, right) => new Date(right.eventDate as Date).getTime() - new Date(left.eventDate as Date).getTime())[0]?.eventDate ?? null,
    };
  }

  private resolvePortfolioValue(periodEnd: Date, facts: AnalyticsFacts): number | null {
    let value = 0;
    let hasValue = false;

    facts.investments.forEach((investment) => {
      const investmentSnapshots = facts.snapshots.filter((snapshot) => String(snapshot.investmentId) === String(investment.id));
      const investmentEvents = facts.events.filter((event) => String(event.investmentId) === String(investment.id));
      const resolvedValue = this.resolveInvestmentValueAtDate(investment, investmentSnapshots, periodEnd, investmentEvents);
      if (investment.accountingTreatment === 'PROTECTION_EXPENSE') return;
      if (investment.accountingTreatment === 'INSURANCE_SAVINGS' && resolvedValue.source !== 'snapshot') return;
      value += resolvedValue.value;
      hasValue = true;
    });

    return hasValue ? value : null;
  }

  private resolvePortfolioValueQuality(
    periodEnd: Date,
    facts: AnalyticsFacts,
    resolvedValue: number | null,
    previousValue: number | null,
  ): AnalyticsPoint['dataQuality']['portfolioValue'] {
    if (resolvedValue === null) return previousValue !== null ? 'carried_forward' : 'unknown';

    const hasSnapshot = facts.snapshots.some(
      (snapshot) => snapshot.snapshotDate && new Date(snapshot.snapshotDate).getTime() <= periodEnd.getTime(),
    );
    if (hasSnapshot) return 'observed';

    const hasConfirmedEvent = facts.events.some(
      (event) => String(event.status ?? '').toUpperCase() === 'CONFIRMED' && event.eventDate && new Date(event.eventDate).getTime() <= periodEnd.getTime(),
    );
    return hasConfirmedEvent ? 'derived' : 'carried_forward';
  }
}