import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LockerEntity, LockerRecord } from '../locker.types';
import type { ILockerDataSourcePort } from './locker.datasource.port';
import { LockerRepository } from './locker.repository';

function createRepository() {
  const dataSource = {
    createEntity: vi.fn(),
    findEntities: vi.fn(),
    findEntity: vi.fn(),
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
    createRecord: vi.fn(),
    findRecords: vi.fn(),
    findRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  };

  return {
    repository: new LockerRepository(dataSource as unknown as ILockerDataSourcePort),
    dataSource,
  };
}

const entity: LockerEntity = {
  uid: 'entity-uid',
  userId: 42,
  label: 'Accounts',
  fields: [{ uid: 'field-uid', label: 'Username', type: 'text', masked: false }],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const record: LockerRecord = {
  uid: 'record-uid',
  entityUid: 'entity-uid',
  label: 'Primary login',
  values: { 'field-uid': 'alice' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('LockerRepository', () => {
  let repository: LockerRepository;
  let dataSource: ReturnType<typeof createRepository>['dataSource'];

  beforeEach(() => {
    ({ repository, dataSource } = createRepository());
  });

  describe('createEntity', () => {
    it('forwards entity data and owner and returns the datasource result', async () => {
      const input = { uid: entity.uid, label: entity.label, fields: entity.fields };
      dataSource.createEntity.mockResolvedValue(entity);

      await expect(repository.createEntity(input, 42)).resolves.toBe(entity);
      expect(dataSource.createEntity).toHaveBeenCalledWith(input, 42);
    });
  });

  describe('findEntities', () => {
    it('forwards the owner and returns its entities', async () => {
      dataSource.findEntities.mockResolvedValue([entity]);

      await expect(repository.findEntities(42)).resolves.toEqual([entity]);
      expect(dataSource.findEntities).toHaveBeenCalledWith(42);
    });
  });

  describe('findEntity', () => {
    it('forwards the entity and owner identifiers and preserves a missing result', async () => {
      dataSource.findEntity.mockResolvedValue(null);

      await expect(repository.findEntity('entity-uid', 42)).resolves.toBeNull();
      expect(dataSource.findEntity).toHaveBeenCalledWith('entity-uid', 42);
    });
  });

  describe('updateEntity', () => {
    it('forwards the entity update data and returns the datasource result', async () => {
      const input = { label: 'Updated accounts' };
      dataSource.updateEntity.mockResolvedValue(entity);

      await expect(repository.updateEntity('entity-uid', input, 42)).resolves.toBe(entity);
      expect(dataSource.updateEntity).toHaveBeenCalledWith('entity-uid', input, 42);
    });
  });

  describe('deleteEntity', () => {
    it('forwards the entity and owner identifiers', async () => {
      dataSource.deleteEntity.mockResolvedValue(undefined);

      await expect(repository.deleteEntity('entity-uid', 42)).resolves.toBeUndefined();
      expect(dataSource.deleteEntity).toHaveBeenCalledWith('entity-uid', 42);
    });
  });

  describe('createRecord', () => {
    it('forwards record data and owner and returns the datasource result', async () => {
      const input = {
        uid: record.uid,
        entityUid: record.entityUid,
        label: record.label,
        values: record.values,
      };
      dataSource.createRecord.mockResolvedValue(record);

      await expect(repository.createRecord(input, 42)).resolves.toBe(record);
      expect(dataSource.createRecord).toHaveBeenCalledWith(input, 42);
    });

    it('preserves a missing result when the entity cannot be used', async () => {
      dataSource.createRecord.mockResolvedValue(null);

      await expect(
        repository.createRecord(
          { uid: 'record-uid', entityUid: 'entity-uid', label: 'Record', values: {} },
          42,
        ),
      ).resolves.toBeNull();
    });
  });

  describe('findRecords', () => {
    it('forwards the optional entity filter and owner', async () => {
      dataSource.findRecords.mockResolvedValue([record]);

      await expect(repository.findRecords('entity-uid', 42)).resolves.toEqual([record]);
      expect(dataSource.findRecords).toHaveBeenCalledWith('entity-uid', 42);
    });

    it('preserves an omitted entity filter', async () => {
      dataSource.findRecords.mockResolvedValue([]);

      await expect(repository.findRecords(undefined, 42)).resolves.toEqual([]);
      expect(dataSource.findRecords).toHaveBeenCalledWith(undefined, 42);
    });
  });

  describe('findRecord', () => {
    it('forwards the record and owner identifiers and returns the datasource result', async () => {
      dataSource.findRecord.mockResolvedValue(record);

      await expect(repository.findRecord('record-uid', 42)).resolves.toBe(record);
      expect(dataSource.findRecord).toHaveBeenCalledWith('record-uid', 42);
    });
  });

  describe('updateRecord', () => {
    it('forwards the record update data and returns the datasource result', async () => {
      const input = { label: 'Updated login' };
      dataSource.updateRecord.mockResolvedValue(record);

      await expect(repository.updateRecord('record-uid', input, 42)).resolves.toBe(record);
      expect(dataSource.updateRecord).toHaveBeenCalledWith('record-uid', input, 42);
    });
  });

  describe('deleteRecord', () => {
    it('forwards the record and owner identifiers', async () => {
      dataSource.deleteRecord.mockResolvedValue(undefined);

      await expect(repository.deleteRecord('record-uid', 42)).resolves.toBeUndefined();
      expect(dataSource.deleteRecord).toHaveBeenCalledWith('record-uid', 42);
    });
  });
});