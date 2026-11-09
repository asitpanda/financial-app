import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateLockerRecordDto } from './update-locker-record.dto';

describe('UpdateLockerRecordDto', () => {
  it('accepts an empty patch and valid partial updates', () => {
    expect(validateSync(plainToInstance(UpdateLockerRecordDto, {}))).toEqual([]);
    expect(validateSync(plainToInstance(UpdateLockerRecordDto, {
      label: 'Updated record',
      values: { username: 'alice', password: null },
    }))).toEqual([]);
  });

  it('accepts null optional values as omitted fields', () => {
    expect(validateSync(plainToInstance(UpdateLockerRecordDto, { label: null, values: null }))).toEqual([]);
  });

  it.each([
    { label: '' },
    { label: 12 },
    { values: [] },
  ])('rejects invalid partial updates: %j', (patch) => {
    expect(validateSync(plainToInstance(UpdateLockerRecordDto, patch)).length).toBeGreaterThan(0);
  });
});