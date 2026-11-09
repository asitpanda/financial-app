import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateLockerEntityDto } from './create-locker-entity.dto';
import { LockerFieldDto } from './locker-field.dto';

describe('CreateLockerEntityDto', () => {
  it('transforms nested fields and accepts a valid entity definition', () => {
    const entity = plainToInstance(CreateLockerEntityDto, {
      label: 'Accounts',
      fields: [{ label: 'Username', type: 'text', masked: false }],
    });

    expect(entity.fields[0]).toBeInstanceOf(LockerFieldDto);
    expect(validateSync(entity)).toEqual([]);
  });

  it.each([
    { label: '' },
    { label: 12 },
    { fields: {} },
    { fields: [{ label: '', type: 'text', masked: false }] },
  ])('rejects invalid entity fields: %j', (overrides) => {
    const entity = plainToInstance(CreateLockerEntityDto, {
      label: 'Accounts', fields: [{ label: 'Username', type: 'text', masked: false }], ...overrides,
    });

    expect(validateSync(entity).length).toBeGreaterThan(0);
  });
});