import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import type { LockerField } from '../locker.types';
import { LockerPrismaRepository } from './locker.prisma.repository';

const fields: LockerField[] = [
  { uid: 'field-uid', label: 'Username', type: 'text', masked: false },
];

const entityRow = (overrides = {}) => ({
  uid: 'entity-uid',
  userId: 42,
  label: 'Accounts',
  fields,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const recordRow = (overrides = {}) => ({
  uid: 'record-uid',
  entityUid: 'entity-uid',
  label: 'Primary login',
  values: { 'field-uid': 'alice' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

function createRepository() {
  const prisma = {
    lockerEntity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lockerRecord: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    repository: new LockerPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('LockerPrismaRepository', () => {
  let repository: LockerPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('createEntity', () => {
    it('persists the owner and maps JSON fields to the entity result', async () => {
      const data = { uid: 'entity-uid', label: 'Accounts', fields };
      prisma.lockerEntity.create.mockResolvedValue(entityRow());

      await expect(repository.createEntity(data, 42)).resolves.toEqual(entityRow());
      expect(prisma.lockerEntity.create).toHaveBeenCalledWith({
        data: { ...data, userId: 42 },
      });
    });
  });

  describe('findEntities', () => {
    it('filters by owner and returns newest entities first', async () => {
      prisma.lockerEntity.findMany.mockResolvedValue([entityRow()]);

      await expect(repository.findEntities(42)).resolves.toEqual([entityRow()]);
      expect(prisma.lockerEntity.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findEntity', () => {
    it('scopes lookup to the owner and returns null when absent', async () => {
      prisma.lockerEntity.findFirst.mockResolvedValue(null);

      await expect(repository.findEntity('entity-uid', 42)).resolves.toBeNull();
      expect(prisma.lockerEntity.findFirst).toHaveBeenCalledWith({
        where: { uid: 'entity-uid', userId: 42 },
      });
    });
  });

  describe('updateEntity', () => {
    it('checks ownership before updating only supplied columns', async () => {
      prisma.lockerEntity.findFirst.mockResolvedValue(entityRow());
      prisma.lockerEntity.update.mockResolvedValue(entityRow({ label: 'Updated' }));

      await expect(repository.updateEntity('entity-uid', { label: 'Updated' }, 42)).resolves.toMatchObject({
        label: 'Updated',
      });
      expect(prisma.lockerEntity.findFirst).toHaveBeenCalledWith({
        where: { uid: 'entity-uid', userId: 42 },
      });
      expect(prisma.lockerEntity.update).toHaveBeenCalledWith({
        where: { uid: 'entity-uid' },
        data: { label: 'Updated' },
      });
    });

    it('does not update an entity that the requester does not own', async () => {
      prisma.lockerEntity.findFirst.mockResolvedValue(null);

      await expect(repository.updateEntity('entity-uid', {}, 42)).resolves.toBeNull();
      expect(prisma.lockerEntity.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteEntity', () => {
    it('deletes only after confirming ownership', async () => {
      prisma.lockerEntity.findFirst.mockResolvedValue(entityRow());
      prisma.lockerEntity.delete.mockResolvedValue(entityRow());

      await expect(repository.deleteEntity('entity-uid', 42)).resolves.toBeUndefined();
      expect(prisma.lockerEntity.delete).toHaveBeenCalledWith({ where: { uid: 'entity-uid' } });
    });

    it('does nothing when the requester does not own the entity', async () => {
      prisma.lockerEntity.findFirst.mockResolvedValue(null);

      await expect(repository.deleteEntity('entity-uid', 42)).resolves.toBeUndefined();
      expect(prisma.lockerEntity.delete).not.toHaveBeenCalled();
    });
  });

  describe('createRecord', () => {
    it('verifies entity ownership before persisting JSON values', async () => {
      const data = {
        uid: 'record-uid',
        entityUid: 'entity-uid',
        label: 'Primary login',
        values: { 'field-uid': 'alice' },
      };
      prisma.lockerEntity.findFirst.mockResolvedValue({ uid: 'entity-uid' });
      prisma.lockerRecord.create.mockResolvedValue(recordRow());

      await expect(repository.createRecord(data, 42)).resolves.toEqual(recordRow());
      expect(prisma.lockerEntity.findFirst).toHaveBeenCalledWith({
        where: { uid: 'entity-uid', userId: 42 },
        select: { uid: true },
      });
      expect(prisma.lockerRecord.create).toHaveBeenCalledWith({
        data,
      });
    });

    it('returns null without inserting when the entity is not owned by the requester', async () => {
      prisma.lockerEntity.findFirst.mockResolvedValue(null);

      await expect(
        repository.createRecord(
          { uid: 'record-uid', entityUid: 'entity-uid', label: 'Record', values: {} },
          42,
        ),
      ).resolves.toBeNull();
      expect(prisma.lockerRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('findRecords', () => {
    it('filters by owner and optional entity, newest first', async () => {
      prisma.lockerRecord.findMany.mockResolvedValue([recordRow()]);

      await expect(repository.findRecords('entity-uid', 42)).resolves.toEqual([recordRow()]);
      expect(prisma.lockerRecord.findMany).toHaveBeenCalledWith({
        where: { entityUid: 'entity-uid', entity: { userId: 42 } },
        orderBy: { createdAt: 'desc' },
      });

      await repository.findRecords(undefined, 42);
      expect(prisma.lockerRecord.findMany).toHaveBeenLastCalledWith({
        where: { entity: { userId: 42 } },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findRecord', () => {
    it('scopes record lookup through its entity owner', async () => {
      prisma.lockerRecord.findFirst.mockResolvedValue(recordRow());

      await expect(repository.findRecord('record-uid', 42)).resolves.toEqual(recordRow());
      expect(prisma.lockerRecord.findFirst).toHaveBeenCalledWith({
        where: { uid: 'record-uid', entity: { userId: 42 } },
      });
    });
  });

  describe('updateRecord', () => {
    it('checks ownership and updates only provided record data', async () => {
      prisma.lockerRecord.findFirst.mockResolvedValue(recordRow());
      prisma.lockerRecord.update.mockResolvedValue(recordRow({ label: 'Updated' }));

      await expect(repository.updateRecord('record-uid', { label: 'Updated' }, 42)).resolves.toMatchObject({
        label: 'Updated',
      });
      expect(prisma.lockerRecord.update).toHaveBeenCalledWith({
        where: { uid: 'record-uid' },
        data: { label: 'Updated' },
      });
    });

    it('does not update a record that is missing or not owned', async () => {
      prisma.lockerRecord.findFirst.mockResolvedValue(null);

      await expect(repository.updateRecord('record-uid', {}, 42)).resolves.toBeNull();
      expect(prisma.lockerRecord.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteRecord', () => {
    it('deletes only after confirming the record owner', async () => {
      prisma.lockerRecord.findFirst.mockResolvedValue(recordRow());
      prisma.lockerRecord.delete.mockResolvedValue(recordRow());

      await expect(repository.deleteRecord('record-uid', 42)).resolves.toBeUndefined();
      expect(prisma.lockerRecord.delete).toHaveBeenCalledWith({ where: { uid: 'record-uid' } });
    });

    it('does nothing when the record is not owned by the requester', async () => {
      prisma.lockerRecord.findFirst.mockResolvedValue(null);

      await expect(repository.deleteRecord('record-uid', 42)).resolves.toBeUndefined();
      expect(prisma.lockerRecord.delete).not.toHaveBeenCalled();
    });
  });
});