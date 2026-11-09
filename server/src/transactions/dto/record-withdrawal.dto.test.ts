import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RecordWithdrawalDto } from './record-withdrawal.dto';

const validWithdrawal = {
  investmentId: '17',
  amount: 50,
  transactionDate: '2026-10-25',
};

describe('RecordWithdrawalDto', () => {
  it('accepts a withdrawal and transforms a string amount to a number', () => {
    const withdrawal = plainToInstance(RecordWithdrawalDto, {
      ...validWithdrawal,
      requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7',
      amount: '50.25',
      notes: 'Partial withdrawal',
    });

    expect(withdrawal.amount).toBe(50.25);
    expect(validateSync(withdrawal)).toEqual([]);
  });

  it('accepts a minimal withdrawal without optional fields', () => {
    expect(validateSync(plainToInstance(RecordWithdrawalDto, validWithdrawal))).toEqual([]);
  });

  it.each(['investmentId', 'amount', 'transactionDate'])('requires %s', (field) => {
    const payload: Record<string, unknown> = { ...validWithdrawal };
    delete payload[field];

    expect(validateSync(plainToInstance(RecordWithdrawalDto, payload)).some((error) => error.property === field)).toBe(true);
  });

  it.each([
    { investmentId: '' },
    { investmentId: 17 },
    { amount: 'not-a-number' },
    { amount: 0 },
    { amount: -0.01 },
    { transactionDate: 'not-a-date' },
  ])('rejects invalid required withdrawal values: %j', (overrides) => {
    const withdrawal = plainToInstance(RecordWithdrawalDto, { ...validWithdrawal, ...overrides });

    expect(validateSync(withdrawal).length).toBeGreaterThan(0);
  });

  it.each(['not-a-uuid', '3f66f0d7-4676-4c9f-b1d8-975fccd83baZ'])('rejects an invalid retry identity: %s', (requestId) => {
    const withdrawal = plainToInstance(RecordWithdrawalDto, { ...validWithdrawal, requestId });

    expect(validateSync(withdrawal).some((error) => error.property === 'requestId')).toBe(true);
  });

  it('rejects non-string notes and accepts null optional values as omitted', () => {
    const invalidNotes = plainToInstance(RecordWithdrawalDto, { ...validWithdrawal, notes: 123 });
    const omittedNotes = plainToInstance(RecordWithdrawalDto, {
      ...validWithdrawal,
      requestId: null,
      notes: null,
    });

    expect(validateSync(invalidNotes).some((error) => error.property === 'notes')).toBe(true);
    expect(validateSync(omittedNotes)).toEqual([]);
  });
});