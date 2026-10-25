import { describe, expect, it } from 'vitest';
import type { CreateLockerEntityInput, CreateLockerRecordInput, LockerEntity, LockerRecord } from './locker.types';

describe('locker types', () => {
  it('supports entity and record payload shapes used by the feature', () => {
    const entity: LockerEntity = {
      uid: 'entity-1',
      userId: 1,
      label: 'Bank Details',
      fields: [{ uid: 'account', label: 'Account', type: 'text', masked: false }],
    };
    const record: LockerRecord = {
      uid: 'record-1',
      entityUid: entity.uid,
      label: 'Primary',
      values: { account: '123' },
    };
    const entityInput: CreateLockerEntityInput = { label: entity.label, fields: entity.fields };
    const recordInput: CreateLockerRecordInput = { entityUid: record.entityUid, label: record.label, values: record.values };

    expect(entityInput.label).toBe('Bank Details');
    expect(recordInput).toMatchObject({ entityUid: 'entity-1', label: 'Primary' });
  });
});
