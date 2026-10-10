import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { isUUID } from 'class-validator';
import { CreateLockerEntityDto } from './dto/create-locker-entity.dto';
import { UpdateLockerEntityDto } from './dto/update-locker-entity.dto';
import { CreateLockerRecordDto } from './dto/create-locker-record.dto';
import { UpdateLockerRecordDto } from './dto/update-locker-record.dto';
import type { LockerField, LockerFieldOption, LockerFieldType } from './locker.types';
import { LockerRepository } from './repositories/locker.repository';
import type { LockerEntityCreateData, LockerEntityUpdateData, LockerRecordCreateData, LockerRecordUpdateData } from './repositories/locker.datasource.port';

@Injectable()
export class LockerService {
  constructor(private readonly repository: LockerRepository) {}

  async createEntity(dto: CreateLockerEntityDto, userId: number) {
    const data: LockerEntityCreateData = {
      uid: randomUUID(),
      label: dto.label.trim(),
      fields: this.normalizeFields(dto.fields),
    };
    return this.repository.createEntity(data, userId);
  }

  findEntities(userId: number) {
    return this.repository.findEntities(userId);
  }

  findEntity(uid: string, userId: number) {
    return this.repository.findEntity(uid, userId);
  }

  async updateEntity(uid: string, dto: UpdateLockerEntityDto, userId: number) {
    const data: LockerEntityUpdateData = {
      ...(dto.label === undefined ? {} : { label: dto.label.trim() }),
      ...(dto.fields === undefined ? {} : { fields: this.normalizeFields(dto.fields) }),
    };
    return this.repository.updateEntity(uid, data, userId);
  }

  deleteEntity(uid: string, userId: number) {
    return this.repository.deleteEntity(uid, userId);
  }

  async createRecord(dto: CreateLockerRecordDto, userId: number) {
    const entity = await this.repository.findEntity(dto.entityUid, userId);
    if (!entity) return null;

    this.validateValues(dto.values, entity.fields);
    const data: LockerRecordCreateData = {
      uid: randomUUID(),
      entityUid: dto.entityUid,
      label: dto.label.trim(),
      values: dto.values,
    };
    return this.repository.createRecord(data, userId);
  }

  async findRecords(entityUid: string | undefined, userId: number) {
    if (entityUid !== undefined && !isUUID(entityUid)) {
      throw new BadRequestException('entityUid must be a valid UUID');
    }
    return this.repository.findRecords(entityUid, userId);
  }

  findRecord(uid: string, userId: number) {
    return this.repository.findRecord(uid, userId);
  }

  async updateRecord(uid: string, dto: UpdateLockerRecordDto, userId: number) {
    const existing = await this.repository.findRecord(uid, userId);
    if (!existing) return null;

    if (dto.values !== undefined) {
      const entity = await this.repository.findEntity(existing.entityUid, userId);
      if (!entity) return null;
      this.validateValues(dto.values, entity.fields);
    }

    const data: LockerRecordUpdateData = {
      ...(dto.label === undefined ? {} : { label: dto.label.trim() }),
      ...(dto.values === undefined ? {} : { values: dto.values }),
    };
    return this.repository.updateRecord(uid, data, userId);
  }

  deleteRecord(uid: string, userId: number) {
    return this.repository.deleteRecord(uid, userId);
  }

  private normalizeFields(fields: CreateLockerEntityDto['fields']): LockerField[] {
    const fieldUids = new Set<string>();

    return fields.map(field => {
      const uid = field.uid ?? randomUUID();
      if (fieldUids.has(uid)) throw new BadRequestException(`Duplicate locker field uid: ${uid}`);
      fieldUids.add(uid);

      const options = field.options?.map(option => ({
        uid: option.uid ?? randomUUID(),
        label: option.label.trim(),
        value: option.value.trim(),
      }));

      if (field.type === 'select' && (!options || options.length === 0)) {
        throw new BadRequestException(`Select field "${field.label}" must define options`);
      }
      if (field.type !== 'select' && options !== undefined) {
        throw new BadRequestException(`Field "${field.label}" cannot define options`);
      }
      if (options) {
        const optionValues = new Set<string>();
        for (const option of options) {
          if (optionValues.has(option.value)) {
            throw new BadRequestException(`Duplicate option value "${option.value}" in field "${field.label}"`);
          }
          optionValues.add(option.value);
        }
      }

      return {
        uid,
        label: field.label.trim(),
        type: field.type as LockerFieldType,
        masked: field.type === 'password' ? true : field.masked,
        ...(options === undefined ? {} : { options: options as LockerFieldOption[] }),
      };
    });
  }

  private validateValues(values: Record<string, string | null>, fields: LockerField[]) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new BadRequestException('values must be an object');
    }

    const fieldMap = new Map(fields.map(field => [field.uid, field]));
    for (const [fieldUid, value] of Object.entries(values)) {
      const field = fieldMap.get(fieldUid);
      if (!field) throw new BadRequestException(`Unknown locker field uid: ${fieldUid}`);
      if (value !== null && typeof value !== 'string') {
        throw new BadRequestException(`Value for field ${fieldUid} must be a string or null`);
      }
      if (value === null) continue;

      if (field.type === 'select' && !field.options?.some(option => option.value === value)) {
        throw new BadRequestException(`Invalid option value for field ${fieldUid}`);
      }
      if (field.type === 'number' && (value.trim() === '' || !Number.isFinite(Number(value)))) {
        throw new BadRequestException(`Value for number field ${fieldUid} must be numeric`);
      }
      if (field.type === 'date' && !this.isDateValue(value)) {
        throw new BadRequestException(`Value for date field ${fieldUid} must use YYYY-MM-DD format`);
      }
    }
  }

  private isDateValue(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }
}
