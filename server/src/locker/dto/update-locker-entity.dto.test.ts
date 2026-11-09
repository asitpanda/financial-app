import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LockerFieldDto } from './locker-field.dto';
import { UpdateLockerEntityDto } from './update-locker-entity.dto';

describe('UpdateLockerEntityDto', () => {
  it('accepts an empty patch and transforms updated nested fields', () => {
    const emptyPatch = plainToInstance(UpdateLockerEntityDto, {});
    const fieldsPatch = plainToInstance(UpdateLockerEntityDto, {
      fields: [{ label: 'Password', type: 'password', masked: true }],
    });

    expect(validateSync(emptyPatch)).toEqual([]);
    expect(fieldsPatch.fields?.[0]).toBeInstanceOf(LockerFieldDto);
    expect(validateSync(fieldsPatch)).toEqual([]);
  });

  it.each([
    { label: '' },
    { label: 12 },
    { fields: {} },
    { fields: [{ label: 'Value', type: 'unknown', masked: false }] },
  ])('rejects invalid update values: %j', (patch) => {
    expect(validateSync(plainToInstance(UpdateLockerEntityDto, patch)).length).toBeGreaterThan(0);
  });
});