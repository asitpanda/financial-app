import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLockerEntityDto } from './dto/create-locker-entity.dto';
import { CreateLockerRecordDto } from './dto/create-locker-record.dto';
import { UpdateLockerEntityDto } from './dto/update-locker-entity.dto';
import { UpdateLockerRecordDto } from './dto/update-locker-record.dto';
import type { LockerEntity, LockerField, LockerRecord } from './locker.types';
import { LockerService } from './locker.service';
import { LockerRepository } from './repositories/locker.repository';

const field = (overrides: Partial<LockerField> = {}): LockerField => ({
  uid: 'field-text',
  label: ' Username ',
  type: 'text',
  masked: false,
  ...overrides,
});

const entity = (overrides: Partial<LockerEntity> = {}): LockerEntity => ({
  uid: 'entity-uid',
  userId: 42,
  label: 'Accounts',
  fields: [field()],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const record = (overrides: Partial<LockerRecord> = {}): LockerRecord => ({
  uid: 'record-uid',
  entityUid: 'entity-uid',
  label: 'Primary login',
  values: { 'field-text': 'alice' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

function createService() {
  const repository = {
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
    service: new LockerService(repository as unknown as LockerRepository),
    repository,
  };
}

describe('LockerService', () => {
  let service: LockerService;
  let repository: ReturnType<typeof createService>['repository'];

  beforeEach(() => {
    ({ service, repository } = createService());
  });

  describe('createEntity', () => {
    it('trims labels, generates identifiers, and always masks password fields', async () => {
      repository.createEntity.mockImplementation(async data => ({ ...entity(), ...data }));
      const dto = {
        label: '  Passwords  ',
        fields: [
          { label: ' Secret ', type: 'password', masked: false },
          {
            label: ' Status ',
            type: 'select',
            masked: false,
            options: [{ label: ' Active ', value: ' active ' }],
          },
        ],
      } as CreateLockerEntityDto;

      await service.createEntity(dto, 42);

      const [data, userId] = repository.createEntity.mock.calls[0];
      expect(userId).toBe(42);
      expect(data.uid).toMatch(/^[0-9a-f-]{36}$/i);
      expect(data.label).toBe('Passwords');
      expect(data.fields).toMatchObject([
        { uid: expect.any(String), label: 'Secret', type: 'password', masked: true },
        {
          uid: expect.any(String),
          label: 'Status',
          type: 'select',
          options: [{ uid: expect.any(String), label: 'Active', value: 'active' }],
        },
      ]);
    });

    it('rejects duplicate field identifiers and duplicate normalized option values', async () => {
      const duplicateFieldDto = {
        label: 'Accounts',
        fields: [
          { uid: 'same', label: 'First', type: 'text', masked: false },
          { uid: 'same', label: 'Second', type: 'text', masked: false },
        ],
      } as CreateLockerEntityDto;
      await expect(service.createEntity(duplicateFieldDto, 42)).rejects.toThrow(
        'Duplicate locker field uid: same',
      );

      const duplicateOptionDto = {
        label: 'Accounts',
        fields: [
          {
            label: 'Status',
            type: 'select',
            masked: false,
            options: [
              { label: 'First', value: ' active ' },
              { label: 'Second', value: 'active' },
            ],
          },
        ],
      } as CreateLockerEntityDto;
      await expect(service.createEntity(duplicateOptionDto, 42)).rejects.toThrow(
        'Duplicate option value "active" in field "Status"',
      );
      expect(repository.createEntity).not.toHaveBeenCalled();
    });

    it('requires options for select fields and forbids options on other field types', async () => {
      await expect(
        service.createEntity(
          { label: 'Accounts', fields: [{ label: 'Status', type: 'select', masked: false }] } as CreateLockerEntityDto,
          42,
        ),
      ).rejects.toThrow('Select field "Status" must define options');

      await expect(
        service.createEntity(
          {
            label: 'Accounts',
            fields: [{ label: 'Name', type: 'text', masked: false, options: [] }],
          } as CreateLockerEntityDto,
          42,
        ),
      ).rejects.toThrow('Field "Name" cannot define options');
      expect(repository.createEntity).not.toHaveBeenCalled();
    });
  });

  describe('findEntities', () => {
    it('returns entities for the requested user', async () => {
      const entities = [entity()];
      repository.findEntities.mockResolvedValue(entities);

      await expect(service.findEntities(42)).resolves.toBe(entities);
      expect(repository.findEntities).toHaveBeenCalledWith(42);
    });
  });

  describe('findEntity', () => {
    it('looks up an entity within the requested user', async () => {
      repository.findEntity.mockResolvedValue(entity());

      await expect(service.findEntity('entity-uid', 42)).resolves.toEqual(entity());
      expect(repository.findEntity).toHaveBeenCalledWith('entity-uid', 42);
    });
  });

  describe('updateEntity', () => {
    it('trims supplied labels and normalizes supplied fields without adding omitted properties', async () => {
      repository.updateEntity.mockResolvedValue(entity());
      const dto = {
        label: '  Updated  ',
        fields: [{ uid: 'field-text', label: ' Login ', type: 'text', masked: false }],
      } as UpdateLockerEntityDto;

      await service.updateEntity('entity-uid', dto, 42);

      expect(repository.updateEntity).toHaveBeenCalledWith(
        'entity-uid',
        { label: 'Updated', fields: [{ uid: 'field-text', label: 'Login', type: 'text', masked: false }] },
        42,
      );
    });

    it('preserves an empty update instead of replacing omitted fields', async () => {
      repository.updateEntity.mockResolvedValue(entity());

      await service.updateEntity('entity-uid', {} as UpdateLockerEntityDto, 42);

      expect(repository.updateEntity).toHaveBeenCalledWith('entity-uid', {}, 42);
    });
  });

  describe('deleteEntity', () => {
    it('deletes the entity for the requested user', async () => {
      repository.deleteEntity.mockResolvedValue(undefined);

      await expect(service.deleteEntity('entity-uid', 42)).resolves.toBeUndefined();
      expect(repository.deleteEntity).toHaveBeenCalledWith('entity-uid', 42);
    });
  });

  describe('createRecord', () => {
    it('returns null and does not create a record when its entity is unavailable', async () => {
      repository.findEntity.mockResolvedValue(null);

      await expect(
        service.createRecord(
          { entityUid: 'missing', label: 'Record', values: {} } as CreateLockerRecordDto,
          42,
        ),
      ).resolves.toBeNull();
      expect(repository.createRecord).not.toHaveBeenCalled();
    });

    it('creates a record with a trimmed label after validating supported field values', async () => {
      const entityFields = [
        field({ uid: 'text', type: 'text' }),
        field({ uid: 'amount', type: 'number' }),
        field({ uid: 'expires', type: 'date' }),
        field({
          uid: 'status',
          type: 'select',
          options: [{ uid: 'active-option', label: 'Active', value: 'active' }],
        }),
      ];
      repository.findEntity.mockResolvedValue(entity({ fields: entityFields }));
      repository.createRecord.mockImplementation(async data => ({ ...record(), ...data }));
      const values = { text: 'value', amount: '0', expires: '2024-02-29', status: 'active' };

      await service.createRecord(
        { entityUid: 'entity-uid', label: '  Primary login  ', values } as CreateLockerRecordDto,
        42,
      );

      const [data, userId] = repository.createRecord.mock.calls[0];
      expect(data).toMatchObject({
        uid: expect.any(String),
        entityUid: 'entity-uid',
        label: 'Primary login',
        values,
      });
      expect(userId).toBe(42);
    });

    it.each([
      ['unknown field', { unknown: 'value' }, 'Unknown locker field uid: unknown'],
      ['number field', { number: '  ' }, 'Value for number field number must be numeric'],
      ['select field', { select: 'inactive' }, 'Invalid option value for field select'],
      ['calendar date', { date: '2023-02-29' }, 'Value for date field date must use YYYY-MM-DD format'],
      ['date format', { date: '2024/02/29' }, 'Value for date field date must use YYYY-MM-DD format'],
    ])('rejects an invalid %s value before persistence', async (_caseName, values, message) => {
      repository.findEntity.mockResolvedValue(
        entity({
          fields: [
            field({ uid: 'number', type: 'number' }),
            field({ uid: 'select', type: 'select', options: [{ uid: 'option', label: 'Active', value: 'active' }] }),
            field({ uid: 'date', type: 'date' }),
          ],
        }),
      );

      await expect(
        service.createRecord(
          { entityUid: 'entity-uid', label: 'Record', values } as unknown as CreateLockerRecordDto,
          42,
        ),
      ).rejects.toThrow(message);
      expect(repository.createRecord).not.toHaveBeenCalled();
    });

    it('accepts null values and rejects values that are not strings or null', async () => {
      repository.findEntity.mockResolvedValue(entity({ fields: [field({ uid: 'field-text' })] }));
      repository.createRecord.mockResolvedValue(record({ values: { 'field-text': null } }));

      await expect(
        service.createRecord(
          { entityUid: 'entity-uid', label: 'Record', values: { 'field-text': null } } as CreateLockerRecordDto,
          42,
        ),
      ).resolves.toMatchObject({ values: { 'field-text': null } });

      await expect(
        service.createRecord(
          {
            entityUid: 'entity-uid',
            label: 'Record',
            values: { 'field-text': 12 },
          } as unknown as CreateLockerRecordDto,
          42,
        ),
      ).rejects.toThrow('Value for field field-text must be a string or null');
    });

    it('rejects values that are not an object', async () => {
      repository.findEntity.mockResolvedValue(entity());

      await expect(
        service.createRecord(
          { entityUid: 'entity-uid', label: 'Record', values: [] } as unknown as CreateLockerRecordDto,
          42,
        ),
      ).rejects.toThrow('values must be an object');
      expect(repository.createRecord).not.toHaveBeenCalled();
    });
  });

  describe('findRecords', () => {
    it('rejects a malformed entity identifier without querying the repository', async () => {
      await expect(service.findRecords('not-a-uuid', 42)).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.findRecords).not.toHaveBeenCalled();
    });

    it('returns records with or without an entity filter', async () => {
      const records = [record()];
      repository.findRecords.mockResolvedValue(records);

      await expect(service.findRecords(undefined, 42)).resolves.toBe(records);
      await expect(service.findRecords('95d27068-76d0-4daf-85e8-43f925de0a31', 42)).resolves.toBe(records);
      expect(repository.findRecords).toHaveBeenNthCalledWith(1, undefined, 42);
      expect(repository.findRecords).toHaveBeenNthCalledWith(2, '95d27068-76d0-4daf-85e8-43f925de0a31', 42);
    });
  });

  describe('findRecord', () => {
    it('looks up a record within the requested user', async () => {
      repository.findRecord.mockResolvedValue(record());

      await expect(service.findRecord('record-uid', 42)).resolves.toEqual(record());
      expect(repository.findRecord).toHaveBeenCalledWith('record-uid', 42);
    });
  });

  describe('updateRecord', () => {
    it('returns null without further lookup when the record is unavailable', async () => {
      repository.findRecord.mockResolvedValue(null);

      await expect(
        service.updateRecord('missing', { label: 'Updated' } as UpdateLockerRecordDto, 42),
      ).resolves.toBeNull();
      expect(repository.findEntity).not.toHaveBeenCalled();
      expect(repository.updateRecord).not.toHaveBeenCalled();
    });

    it('validates updated values against the owning entity before persisting', async () => {
      repository.findRecord.mockResolvedValue(record());
      repository.findEntity.mockResolvedValue(entity());

      await expect(
        service.updateRecord(
          'record-uid',
          { values: { unknown: 'value' } } as UpdateLockerRecordDto,
          42,
        ),
      ).rejects.toThrow('Unknown locker field uid: unknown');
      expect(repository.updateRecord).not.toHaveBeenCalled();
    });

    it('returns null when the record entity is unavailable and otherwise trims partial updates', async () => {
      repository.findRecord.mockResolvedValue(record());
      repository.findEntity.mockResolvedValueOnce(null).mockResolvedValueOnce(entity());

      await expect(
        service.updateRecord('record-uid', { values: {} } as UpdateLockerRecordDto, 42),
      ).resolves.toBeNull();
      await service.updateRecord(
        'record-uid',
        { label: '  Updated  ' } as UpdateLockerRecordDto,
        42,
      );

      expect(repository.updateRecord).toHaveBeenCalledWith('record-uid', { label: 'Updated' }, 42);
    });
  });

  describe('deleteRecord', () => {
    it('deletes the record for the requested user', async () => {
      repository.deleteRecord.mockResolvedValue(undefined);

      await expect(service.deleteRecord('record-uid', 42)).resolves.toBeUndefined();
      expect(repository.deleteRecord).toHaveBeenCalledWith('record-uid', 42);
    });
  });
});