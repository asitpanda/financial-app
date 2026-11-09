import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LockerFieldDto } from './locker-field.dto';
import { LockerFieldOptionDto } from './locker-field-option.dto';

describe('LockerFieldDto', () => {
  it.each(['text', 'password', 'number', 'select', 'date'])('accepts the %s field type', (type) => {
    const field = plainToInstance(LockerFieldDto, { label: 'Value', type, masked: false });

    expect(validateSync(field)).toEqual([]);
  });

  it('transforms nested options and accepts an optional UUID', () => {
    const field = plainToInstance(LockerFieldDto, {
      uid: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7',
      label: 'Status',
      type: 'select',
      masked: false,
      options: [{ label: 'Active', value: 'active' }],
    });

    expect(field.options?.[0]).toBeInstanceOf(LockerFieldOptionDto);
    expect(validateSync(field)).toEqual([]);
  });

  it.each([
    { uid: 'not-a-uuid' },
    { label: '' },
    { type: 'email' },
    { masked: 'false' },
    { options: [{ label: '', value: 'active' }] },
  ])('rejects invalid field values and nested options: %j', (overrides) => {
    const field = plainToInstance(LockerFieldDto, {
      label: 'Value', type: 'text', masked: false, ...overrides,
    });

    expect(validateSync(field).length).toBeGreaterThan(0);
  });
});