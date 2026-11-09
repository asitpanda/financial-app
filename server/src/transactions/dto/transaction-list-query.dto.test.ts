import { TransactionType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { TransactionListQueryDto } from './transaction-list-query.dto';

describe('TransactionListQueryDto', () => {
  it('transforms account and category IDs and accepts the supported transaction filters', () => {
    const query = plainToInstance(TransactionListQueryDto, {
      search: 'rent',
      accountId: '9',
      categoryId: '5',
      type: 'EXPENSE',
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
      sortBy: 'amount',
      sortDirection: 'desc',
    });

    expect(query).toMatchObject({
      accountId: 9,
      categoryId: 5,
      type: 'EXPENSE',
      sortBy: 'amount',
      sortDirection: 'desc',
    });
    expect(validateSync(query)).toEqual([]);
  });

  it('accepts each supported transaction type and sort option', () => {
    const typeQueries = Object.values(TransactionType).map((type) =>
      plainToInstance(TransactionListQueryDto, { type }),
    );
    const sortQueries = ['date', 'amount', 'createdAt'].flatMap((sortBy) => [
      plainToInstance(TransactionListQueryDto, { sortBy, sortDirection: 'asc' }),
      plainToInstance(TransactionListQueryDto, { sortBy, sortDirection: 'desc' }),
    ]);

    expect(typeQueries.flatMap((query) => validateSync(query))).toEqual([]);
    expect(sortQueries.flatMap((query) => validateSync(query))).toEqual([]);
  });

  it('treats a blank category ID as an omitted filter', () => {
    const query = plainToInstance(TransactionListQueryDto, { categoryId: '' });

    expect(query.categoryId).toBeUndefined();
    expect(validateSync(query)).toEqual([]);
  });

  it.each([null, undefined])('preserves an explicitly nullable category filter (%s)', (categoryId) => {
    const query = plainToInstance(TransactionListQueryDto, { categoryId });

    expect(query.categoryId).toBe(categoryId);
    expect(validateSync(query)).toEqual([]);
  });

  it.each([
    { accountId: '0' },
    { accountId: '-1' },
    { accountId: '1.5' },
    { accountId: 'not-a-number' },
    { categoryId: '0' },
    { categoryId: '-1' },
    { categoryId: '1.5' },
    { categoryId: 'not-a-number' },
  ])('rejects invalid account or category identifiers: %j', (input) => {
    const query = plainToInstance(TransactionListQueryDto, input);

    expect(validateSync(query).length).toBeGreaterThan(0);
  });

  it.each([
    { type: 'UNKNOWN' },
    { fromDate: 'not-a-date' },
    { toDate: 'not-a-date' },
    { sortBy: 'category' },
    { sortDirection: 'up' },
    { search: 123 },
    { search: 'x'.repeat(121) },
  ])('rejects unsupported filter values: %j', (input) => {
    const query = plainToInstance(TransactionListQueryDto, input);

    expect(validateSync(query).length).toBeGreaterThan(0);
  });
});