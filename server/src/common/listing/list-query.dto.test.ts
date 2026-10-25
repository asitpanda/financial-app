import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ListQueryDto } from './list-query.dto';

describe('ListQueryDto', () => {
  it('uses valid defaults when query values are omitted', () => {
    const query = plainToInstance(ListQueryDto, {});

    expect(query).toMatchObject({ page: 1, limit: 25 });
    expect(validateSync(query)).toEqual([]);
  });

  it('transforms numeric strings and accepts the supported limits', () => {
    const query = plainToInstance(ListQueryDto, { page: '2', limit: '100' });

    expect(query).toMatchObject({ page: 2, limit: 100 });
    expect(validateSync(query)).toEqual([]);
  });

  it.each([
    { page: '0', limit: '25' },
    { page: '1.5', limit: '25' },
    { page: '1', limit: '0' },
    { page: '1', limit: '101' },
  ])('rejects values outside the pagination query contract: %o', (input) => {
    const query = plainToInstance(ListQueryDto, input);

    expect(validateSync(query).length).toBeGreaterThan(0);
  });
});