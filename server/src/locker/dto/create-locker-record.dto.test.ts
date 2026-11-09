import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateLockerRecordDto } from './create-locker-record.dto';

describe('CreateLockerRecordDto', () => {
  it('accepts a record with string and null values', () => {
    const record = plainToInstance(CreateLockerRecordDto, {
      entityUid: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7',
      label: 'Primary account',
      values: { username: 'alice', recoveryCode: null },
    });

    expect(validateSync(record)).toEqual([]);
  });

  it.each([
    { entityUid: 'not-a-uuid' },
    { label: '' },
    { label: 12 },
    { values: [] },
    { values: null },
  ])('rejects invalid record fields: %j', (overrides) => {
    const record = plainToInstance(CreateLockerRecordDto, {
      entityUid: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7',
      label: 'Primary account',
      values: {},
      ...overrides,
    });

    expect(validateSync(record).length).toBeGreaterThan(0);
  });
});