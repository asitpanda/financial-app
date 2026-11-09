import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LockerFieldOptionDto } from './locker-field-option.dto';

describe('LockerFieldOptionDto', () => {
  it('accepts an option with or without an identifier', () => {
    const withUid = plainToInstance(LockerFieldOptionDto, {
      uid: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7', label: 'Active', value: 'active',
    });
    const withoutUid = plainToInstance(LockerFieldOptionDto, { label: 'Inactive', value: 'inactive' });

    expect(validateSync(withUid)).toEqual([]);
    expect(validateSync(withoutUid)).toEqual([]);
  });

  it.each([
    { uid: 'not-a-uuid' },
    { label: '' },
    { label: 1 },
    { value: '' },
    { value: 1 },
  ])('rejects invalid option fields: %j', (overrides) => {
    const option = plainToInstance(LockerFieldOptionDto, {
      label: 'Active', value: 'active', ...overrides,
    });

    expect(validateSync(option).length).toBeGreaterThan(0);
  });
});