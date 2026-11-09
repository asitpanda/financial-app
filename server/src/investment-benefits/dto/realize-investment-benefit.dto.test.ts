import { InvestmentBenefitType, InvestmentEventType, TransactionType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  BenefitRealizationTransactionDto,
  InvestmentBenefitRealizationComponentDto,
  QuickRealizeInvestmentBenefitDto,
  RealizeInvestmentBenefitDto,
} from './realize-investment-benefit.dto';

describe('realize-investment-benefit.dto', () => {
  it('accepts valid transaction options and omitted optional values', () => {
    const transaction = plainToInstance(BenefitRealizationTransactionDto, {
      type: TransactionType.INCOME,
      sourceAccountId: 1,
      destinationAccountId: 2,
      categoryId: 3,
      goalId: 4,
      notes: 'Benefit payout',
    });

    expect(validateSync(transaction)).toEqual([]);
    expect(validateSync(plainToInstance(BenefitRealizationTransactionDto, {}))).toEqual([]);
  });

  it.each([
    { type: 'UNKNOWN' },
    { sourceAccountId: '1' },
    { destinationAccountId: '2' },
    { categoryId: '3' },
    { goalId: '4' },
    { notes: 12 },
  ])('rejects invalid transaction option values: %o', (input) => {
    const transaction = plainToInstance(BenefitRealizationTransactionDto, input);

    expect(validateSync(transaction).length).toBeGreaterThan(0);
  });

  it('accepts a component with a transformed transaction and optional details', () => {
    const component = plainToInstance(InvestmentBenefitRealizationComponentDto, {
      eventType: InvestmentEventType.BENEFIT_RECEIPT,
      amount: 125.5,
      eventDate: '2026-11-09T00:00:00.000Z',
      notes: 'Coupon received',
      transaction: { type: TransactionType.INCOME, sourceAccountId: 1 },
    });

    expect(component.transaction).toBeInstanceOf(BenefitRealizationTransactionDto);
    expect(validateSync(component)).toEqual([]);
    expect(
      validateSync(
        plainToInstance(InvestmentBenefitRealizationComponentDto, {
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 1,
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    { eventType: 'UNKNOWN', amount: 1 },
    { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 0 },
    { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: -1 },
    { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: '1' },
    { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1, eventDate: 'not-a-date' },
    { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1, notes: 12 },
    {
      eventType: InvestmentEventType.BENEFIT_RECEIPT,
      amount: 1,
      transaction: { type: 'UNKNOWN' },
    },
  ])('rejects an invalid component value: %o', (input) => {
    const component = plainToInstance(InvestmentBenefitRealizationComponentDto, input);

    expect(validateSync(component).length).toBeGreaterThan(0);
  });

  it('accepts a realization with nested components and optional destination details', () => {
    const realization = plainToInstance(RealizeInvestmentBenefitDto, {
      components: [
        { eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 125 },
        { eventType: InvestmentEventType.INCOME_CREDIT, amount: 25 },
      ],
      benefitAmount: 150,
      benefitDate: '2026-11-09T00:00:00.000Z',
      destinationAccountId: 2,
      notes: 'Maturity proceeds',
      closesInvestment: true,
    });

    expect(realization.components[0]).toBeInstanceOf(InvestmentBenefitRealizationComponentDto);
    expect(validateSync(realization)).toEqual([]);
    expect(
      validateSync(
        plainToInstance(RealizeInvestmentBenefitDto, {
          components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }],
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    { components: [{ eventType: 'UNKNOWN', amount: 1 }] },
    { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 0 }] },
    { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }], benefitAmount: 0 },
    { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }], benefitDate: 'not-a-date' },
    { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }], destinationAccountId: 0 },
    { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }], destinationAccountId: 1.5 },
    { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }], notes: 12 },
  ])('rejects invalid realization values, including nested component errors: %o', (input) => {
    const realization = plainToInstance(RealizeInvestmentBenefitDto, input);

    expect(validateSync(realization).length).toBeGreaterThan(0);
  });

  it('accepts a null destination account when the optional account override is cleared', () => {
    const realization = plainToInstance(RealizeInvestmentBenefitDto, {
      components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }],
      destinationAccountId: null,
    });

    expect(validateSync(realization)).toEqual([]);
  });

  it('requires valid benefit and event types for quick realization', () => {
    const realization = plainToInstance(QuickRealizeInvestmentBenefitDto, {
      benefitType: InvestmentBenefitType.COUPON,
      eventType: InvestmentEventType.BENEFIT_RECEIPT,
      amount: 125,
      benefitDate: '2026-11-09T00:00:00.000Z',
      benefitNotes: 'Coupon received',
      destinationAccountId: 2,
      closesInvestment: false,
    });

    expect(validateSync(realization)).toEqual([]);
    expect(
      validateSync(
        plainToInstance(QuickRealizeInvestmentBenefitDto, {
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 1,
        }),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateSync(
        plainToInstance(QuickRealizeInvestmentBenefitDto, {
          benefitType: 'UNKNOWN',
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 1,
        }),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateSync(
        plainToInstance(QuickRealizeInvestmentBenefitDto, {
          benefitType: InvestmentBenefitType.COUPON,
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 0,
        }),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateSync(
        plainToInstance(QuickRealizeInvestmentBenefitDto, {
          benefitType: InvestmentBenefitType.COUPON,
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 1,
          benefitNotes: 12,
        }),
      ).length,
    ).toBeGreaterThan(0);
  });
});