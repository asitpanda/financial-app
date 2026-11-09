import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RecordContributionDto } from './record-contribution.dto';

const validContribution = {
  investmentId: '17',
  amount: 75.25,
  transactionDate: '2026-10-25',
};

describe('RecordContributionDto', () => {
  it('accepts a contribution and transforms a string amount to a number', () => {
    const contribution = plainToInstance(RecordContributionDto, {
      ...validContribution,
      requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7',
      contributionPlanId: '23',
      amount: '75.25',
      notes: 'Monthly contribution',
    });

    expect(contribution.amount).toBe(75.25);
    expect(validateSync(contribution)).toEqual([]);
  });

  it('accepts a minimal contribution without optional fields', () => {
    expect(validateSync(plainToInstance(RecordContributionDto, validContribution))).toEqual([]);
  });

  it.each(['investmentId', 'amount', 'transactionDate'])('requires %s', (field) => {
    const payload: Record<string, unknown> = { ...validContribution };
    delete payload[field];

    expect(validateSync(plainToInstance(RecordContributionDto, payload)).some((error) => error.property === field)).toBe(true);
  });

  it.each([
    { investmentId: '' },
    { investmentId: 17 },
    { amount: 'not-a-number' },
    { amount: 0 },
    { amount: -0.01 },
    { transactionDate: 'not-a-date' },
  ])('rejects invalid required contribution values: %j', (overrides) => {
    const contribution = plainToInstance(RecordContributionDto, { ...validContribution, ...overrides });

    expect(validateSync(contribution).length).toBeGreaterThan(0);
  });

  it.each(['not-a-uuid', '3f66f0d7-4676-4c9f-b1d8-975fccd83baZ'])('rejects an invalid retry identity: %s', (requestId) => {
    const contribution = plainToInstance(RecordContributionDto, { ...validContribution, requestId });

    expect(validateSync(contribution).some((error) => error.property === 'requestId')).toBe(true);
  });

  it.each(['contributionPlanId', 'notes'])('rejects a non-string %s value', (field) => {
    const contribution = plainToInstance(RecordContributionDto, { ...validContribution, [field]: 23 });

    expect(validateSync(contribution).some((error) => error.property === field)).toBe(true);
  });

  it('accepts null optional values as omitted fields', () => {
    const contribution = plainToInstance(RecordContributionDto, {
      ...validContribution,
      requestId: null,
      contributionPlanId: null,
      notes: null,
    });

    expect(validateSync(contribution)).toEqual([]);
  });
});