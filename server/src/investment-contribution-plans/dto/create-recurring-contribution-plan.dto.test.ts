import { InvestmentEventType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateRecurringContributionPlanDto } from './create-recurring-contribution-plan.dto';
import { HistoricalContributionItemDto } from './historical-contribution-item.dto';

const validPlan = {
  amount: 100,
  cadenceUnit: 'month',
  cadenceInterval: 1,
  anchorDate: '2026-11-09',
  historicalImportMode: 'OPENING_BALANCE',
};

const validHistoricalItem = {
  dueDate: '2026-10-01',
  amount: 100,
  selected: true,
  status: 'CONFIRMED',
  eventDate: '2026-10-01',
  eventType: InvestmentEventType.CONTRIBUTION,
  sequenceNumber: 1,
  notes: 'Recorded contribution',
};

describe('CreateRecurringContributionPlanDto', () => {
  it('accepts a valid plan with required fields only', () => {
    const plan = plainToInstance(CreateRecurringContributionPlanDto, validPlan);

    expect(validateSync(plan)).toEqual([]);
  });

  it('accepts valid optional schedule and reviewed-history details', () => {
    const plan = plainToInstance(CreateRecurringContributionPlanDto, {
      ...validPlan,
      endDate: '2030-11-09',
      autoCreateEvent: true,
      openingPrincipalAmount: 0,
      openingIncomeAmount: 25,
      reviewedHistoricalItems: [validHistoricalItem],
    });

    expect(plan.reviewedHistoricalItems?.[0]).toBeInstanceOf(HistoricalContributionItemDto);
    expect(validateSync(plan)).toEqual([]);
  });

  it.each([
    { amount: 0 },
    { amount: -1 },
    { amount: '100' },
    { cadenceUnit: 'biweekly' },
    { cadenceUnit: 1 },
    { cadenceInterval: 0 },
    { cadenceInterval: 1.5 },
    { anchorDate: 'not-a-date' },
    { historicalImportMode: 'UNKNOWN' },
  ])('rejects invalid required schedule values: %o', (overrides) => {
    const plan = plainToInstance(CreateRecurringContributionPlanDto, { ...validPlan, ...overrides });

    expect(validateSync(plan).length).toBeGreaterThan(0);
  });

  it.each([
    { endDate: 'not-a-date' },
    { autoCreateEvent: 'true' },
    { openingPrincipalAmount: -1 },
    { openingPrincipalAmount: '100' },
    { openingIncomeAmount: -1 },
    { openingIncomeAmount: '25' },
  ])('rejects invalid optional schedule values: %o', (overrides) => {
    const plan = plainToInstance(CreateRecurringContributionPlanDto, { ...validPlan, ...overrides });

    expect(validateSync(plan).length).toBeGreaterThan(0);
  });

  it('accepts an empty reviewed-history list and a list at the 2,000-item limit', () => {
    const emptyPlan = plainToInstance(CreateRecurringContributionPlanDto, {
      ...validPlan,
      reviewedHistoricalItems: [],
    });
    const fullPlan = plainToInstance(CreateRecurringContributionPlanDto, {
      ...validPlan,
      reviewedHistoricalItems: Array.from({ length: 2000 }, () => ({ ...validHistoricalItem })),
    });

    expect(validateSync(emptyPlan)).toEqual([]);
    expect(validateSync(fullPlan)).toEqual([]);
  });

  it('rejects invalid reviewed-history collections and nested items', () => {
    const nonArrayPlan = plainToInstance(CreateRecurringContributionPlanDto, {
      ...validPlan,
      reviewedHistoricalItems: validHistoricalItem,
    });
    const oversizedPlan = plainToInstance(CreateRecurringContributionPlanDto, {
      ...validPlan,
      reviewedHistoricalItems: Array.from({ length: 2001 }, () => ({ ...validHistoricalItem })),
    });
    const invalidItemPlan = plainToInstance(CreateRecurringContributionPlanDto, {
      ...validPlan,
      reviewedHistoricalItems: [{ ...validHistoricalItem, amount: 0 }],
    });

    expect(validateSync(nonArrayPlan).length).toBeGreaterThan(0);
    expect(validateSync(oversizedPlan).length).toBeGreaterThan(0);
    expect(validateSync(invalidItemPlan).length).toBeGreaterThan(0);
  });
});