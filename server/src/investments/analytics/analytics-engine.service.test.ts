import { InvestmentEventType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { EventLike } from '../investment.types';
import { AnalyticsEngineService } from './analytics-engine.service';

function createService() {
  return new AnalyticsEngineService({} as never, {} as never);
}

function event(overrides: Partial<EventLike> = {}): EventLike {
  return {
    status: 'CONFIRMED',
    eventType: InvestmentEventType.CONTRIBUTION,
    eventDate: new Date('2026-01-01T00:00:00.000Z'),
    amount: 100,
    ...overrides,
  };
}

describe('AnalyticsEngineService', () => {
  describe('deriveEventValuation', () => {
    it('derives invested principal and current value from confirmed activity', () => {
      const valuation = createService().deriveEventValuation([
        event({ amount: 1000 }),
        event({ eventType: InvestmentEventType.OPENING_BALANCE, amount: 200 }),
        event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 250 }),
        event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: 30 }),
        event({
          eventType: InvestmentEventType.OPENING_INCOME_CREDIT,
          eventDate: new Date('2026-02-01T00:00:00.000Z'),
          amount: 10,
        }),
        event({ status: 'PENDING', amount: 5000 }),
      ]);

      expect(valuation).toMatchObject({
        totalInvested: 950,
        currentValue: 990,
        currentValueSource: 'manual',
      });
      expect(valuation?.lastValuationAt).toEqual(new Date('2026-02-01T00:00:00.000Z'));
    });

    it('treats insurance-savings premiums as invested principal without estimating a value', () => {
      const valuation = createService().deriveEventValuation(
        [
          event({ eventType: InvestmentEventType.PREMIUM, amount: 500 }),
          event({ eventType: InvestmentEventType.CONTRIBUTION, amount: 100 }),
          event({ eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 50 }),
          event({ eventType: InvestmentEventType.INCOME_CREDIT, amount: 25 }),
        ],
        'INSURANCE_SAVINGS',
      );

      expect(valuation).toMatchObject({
        totalInvested: 600,
        currentValue: 0,
        currentValueSource: 'manual',
      });
    });

    it('returns no valuation when there are no confirmed events or the treatment is protection expense', () => {
      expect(createService().deriveEventValuation([event({ status: 'PENDING' })])).toBeNull();
      expect(
        createService().deriveEventValuation([event()], 'PROTECTION_EXPENSE'),
      ).toBeNull();
    });
  });
});