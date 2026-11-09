import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateTransactionDto } from './create-transaction.dto';

const validTransaction = {
  type: 'EXPENSE',
  amount: 25,
  date: '2026-10-25',
};

describe('CreateTransactionDto', () => {
  it.each(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'])('accepts the %s transaction type', (type) => {
    const transaction = plainToInstance(CreateTransactionDto, { ...validTransaction, type });

    expect(validateSync(transaction)).toEqual([]);
  });

  it('transforms optional reference IDs and accepts optional text fields', () => {
    const transaction = plainToInstance(CreateTransactionDto, {
      ...validTransaction,
      categoryId: '5',
      sourceAccountId: '6',
      destinationAccountId: '7',
      goalId: '8',
      categoryLabelSnapshot: 'Dining',
      notes: 'Dinner with friends',
    });

    expect(transaction).toMatchObject({
      categoryId: 5,
      sourceAccountId: 6,
      destinationAccountId: 7,
      goalId: 8,
      categoryLabelSnapshot: 'Dining',
      notes: 'Dinner with friends',
    });
    expect(validateSync(transaction)).toEqual([]);
  });

  it('accepts omitted and null optional text values', () => {
    const transaction = plainToInstance(CreateTransactionDto, {
      ...validTransaction,
      categoryLabelSnapshot: null,
      notes: null,
    });

    expect(validateSync(transaction)).toEqual([]);
  });

  it.each(['type', 'amount', 'date'])('requires %s', (field) => {
    const payload: Record<string, unknown> = { ...validTransaction };
    delete payload[field];

    expect(validateSync(plainToInstance(CreateTransactionDto, payload)).some((error) => error.property === field)).toBe(true);
  });

  it.each([
    { type: 'UNKNOWN' },
    { type: '' },
    { type: 1 },
    { amount: '25' },
    { amount: null },
    { amount: Number.NaN },
    { date: 'not-a-date' },
    { date: '' },
  ])('rejects malformed required transaction values: %j', (overrides) => {
    const transaction = plainToInstance(CreateTransactionDto, { ...validTransaction, ...overrides });

    expect(validateSync(transaction).length).toBeGreaterThan(0);
  });

  it.each([
    ['categoryId', 'not-an-integer'],
    ['categoryId', '1.5'],
    ['sourceAccountId', 'not-an-integer'],
    ['destinationAccountId', '2.5'],
    ['goalId', '3.5'],
  ])('rejects a malformed optional %s reference', (field, value) => {
    const transaction = plainToInstance(CreateTransactionDto, { ...validTransaction, [field]: value });

    expect(validateSync(transaction).some((error) => error.property === field)).toBe(true);
  });

  it.each(['categoryLabelSnapshot', 'notes'])('rejects a non-string %s value', (field) => {
    const transaction = plainToInstance(CreateTransactionDto, { ...validTransaction, [field]: 123 });

    expect(validateSync(transaction).some((error) => error.property === field)).toBe(true);
  });
});