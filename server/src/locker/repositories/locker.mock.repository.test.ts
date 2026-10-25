import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LockerEntityCreateData, LockerRecordCreateData } from './locker.datasource.port';
import type { LockerMockRepository } from './locker.mock.repository';

const entityData = (uid: string): LockerEntityCreateData => ({
  uid,
  label: `Entity ${uid}`,
  fields: [{ uid: `field-${uid}`, label: 'Name', type: 'text', masked: false }],
});

const recordData = (uid: string, entityUid: string): LockerRecordCreateData => ({
  uid,
  entityUid,
  label: `Record ${uid}`,
  values: { [`field-${entityUid}`]: 'value' },
});

describe('LockerMockRepository', () => {
  let repository: LockerMockRepository;

  beforeEach(async () => {
    vi.resetModules();
    const { LockerMockRepository: Repository } = await import('./locker.mock.repository');
    repository = new Repository();
  });

  describe('findEntities', () => {
    it('returns only entities owned by the requested user', async () => {
      await repository.createEntity(entityData('entity-a'), 42);
      await repository.createEntity(entityData('entity-b'), 7);

      await expect(repository.findEntities(42)).resolves.toMatchObject([{ uid: 'entity-a', userId: 42 }]);
    });
  });

  describe('updateEntity', () => {
    it('updates an entity owned by the requester', async () => {
      await repository.createEntity(entityData('entity-a'), 42);

      await expect(repository.updateEntity('entity-a', { label: 'Changed' }, 42)).resolves.toMatchObject({
        label: 'Changed',
      });
    });

    it('does not update an entity belonging to another user', async () => {
      await repository.createEntity(entityData('entity-a'), 7);

      await expect(repository.updateEntity('entity-a', { label: 'Changed' }, 42)).resolves.toBeNull();
      await expect(repository.findEntity('entity-a', 7)).resolves.toMatchObject({ label: 'Entity entity-a' });
    });
  });

  describe('createRecord', () => {
    it('refuses to attach a record to an entity the user does not own', async () => {
      await repository.createEntity(entityData('entity-a'), 7);

      await expect(repository.createRecord(recordData('record-a', 'entity-a'), 42)).resolves.toBeNull();
      await expect(repository.findRecords(undefined, 7)).resolves.toEqual([]);
    });
  });

  describe('findRecords', () => {
    it('returns only records under owned entities and applies the optional entity filter', async () => {
      await repository.createEntity(entityData('entity-a'), 42);
      await repository.createEntity(entityData('entity-b'), 42);
      await repository.createEntity(entityData('entity-c'), 7);
      await repository.createRecord(recordData('record-a', 'entity-a'), 42);
      await repository.createRecord(recordData('record-b', 'entity-b'), 42);
      await repository.createRecord(recordData('record-c', 'entity-c'), 7);

      await expect(repository.findRecords(undefined, 42)).resolves.toMatchObject([
        { uid: 'record-a' },
        { uid: 'record-b' },
      ]);
      await expect(repository.findRecords('entity-b', 42)).resolves.toMatchObject([{ uid: 'record-b' }]);
    });
  });

  describe('deleteEntity', () => {
    it('removes owned records with the entity and leaves another user data intact', async () => {
      await repository.createEntity(entityData('entity-a'), 42);
      await repository.createEntity(entityData('entity-b'), 7);
      await repository.createRecord(recordData('record-a', 'entity-a'), 42);
      await repository.createRecord(recordData('record-b', 'entity-b'), 7);

      await repository.deleteEntity('entity-a', 42);

      await expect(repository.findEntities(42)).resolves.toEqual([]);
      await expect(repository.findRecords(undefined, 42)).resolves.toEqual([]);
      await expect(repository.findRecords(undefined, 7)).resolves.toMatchObject([{ uid: 'record-b' }]);
    });
  });

  describe('updateRecord', () => {
    it('updates only a record visible to the requesting user', async () => {
      await repository.createEntity(entityData('entity-a'), 42);
      await repository.createRecord(recordData('record-a', 'entity-a'), 42);

      await expect(
        repository.updateRecord('record-a', { label: 'Updated' }, 42),
      ).resolves.toMatchObject({ label: 'Updated' });
      await expect(repository.updateRecord('record-a', { label: 'Wrong owner' }, 7)).resolves.toBeNull();
    });
  });

  describe('deleteRecord', () => {
    it('deletes only a record visible to the requesting user', async () => {
      await repository.createEntity(entityData('entity-a'), 42);
      await repository.createRecord(recordData('record-a', 'entity-a'), 42);

      await repository.deleteRecord('record-a', 7);
      await expect(repository.findRecord('record-a', 42)).resolves.not.toBeNull();

      await repository.deleteRecord('record-a', 42);
      await expect(repository.findRecord('record-a', 42)).resolves.toBeNull();
    });
  });
});