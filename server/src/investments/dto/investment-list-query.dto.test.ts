import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { InvestmentListQueryDto } from './investment-list-query.dto';

describe('InvestmentListQueryDto', () => {
  it('transforms comma-separated IDs and accepts supported investment filters', () => {
    const query = plainToInstance(InvestmentListQueryDto, {
      ids: '3, 4',
      search: 'index',
      status: 'active',
      assetType: 'EQUITY',
      accountingTreatment: 'INVESTMENT',
      sortBy: 'currentValue',
      sortDirection: 'desc',
    });

    expect(query.ids).toEqual([3, 4]);
    expect(validateSync(query)).toEqual([]);
  });

  it('preserves IDs that have already been parsed into an array', () => {
    const query = plainToInstance(InvestmentListQueryDto, { ids: [3, 4] });

    expect(query.ids).toEqual([3, 4]);
    expect(validateSync(query)).toEqual([]);
  });

  it('accepts omitted investment filters with the shared pagination defaults', () => {
    const query = plainToInstance(InvestmentListQueryDto, {});

    expect(query).toMatchObject({ page: 1, limit: 25 });
    expect(validateSync(query)).toEqual([]);
  });

  it.each([
    { status: 'pending' },
    { assetType: 'x'.repeat(61) },
    { accountingTreatment: 'UNKNOWN' },
    { ids: '3,0' },
    { ids: '3,invalid' },
    { sortBy: 'unknown' },
    { sortDirection: 'up' },
    { search: 'x'.repeat(121) },
  ])('rejects invalid investment filter values: %o', (input) => {
    const query = plainToInstance(InvestmentListQueryDto, input);

    expect(validateSync(query).length).toBeGreaterThan(0);
  });
});