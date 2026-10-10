import { Injectable } from '@nestjs/common';
import type { LockerEntity, LockerRecord } from '../locker.types';
import type {
  ILockerDataSourcePort,
  LockerEntityCreateData,
  LockerEntityUpdateData,
  LockerRecordCreateData,
  LockerRecordUpdateData,
} from './locker.datasource.port';

let entities: LockerEntity[] = [];
let records: LockerRecord[] = [];

@Injectable()
export class LockerMockRepository implements ILockerDataSourcePort {
  async createEntity(data: LockerEntityCreateData, userId: number): Promise<LockerEntity> {
    const now = new Date();
    const entity = { ...data, userId, createdAt: now, updatedAt: now };
    entities.push(entity);
    return entity;
  }

  async findEntities(userId: number): Promise<LockerEntity[]> {
    return entities.filter(entity => entity.userId === userId);
  }

  async findEntity(uid: string, userId: number): Promise<LockerEntity | null> {
    return entities.find(entity => entity.uid === uid && entity.userId === userId) ?? null;
  }

  async updateEntity(uid: string, data: LockerEntityUpdateData, userId: number): Promise<LockerEntity | null> {
    const entity = await this.findEntity(uid, userId);
    if (!entity) return null;
    Object.assign(entity, data, { updatedAt: new Date() });
    return entity;
  }

  async deleteEntity(uid: string, userId: number): Promise<void> {
    const entity = await this.findEntity(uid, userId);
    if (!entity) return;
    entities = entities.filter(item => item.uid !== uid);
    records = records.filter(record => record.entityUid !== uid);
  }

  async createRecord(data: LockerRecordCreateData, userId: number): Promise<LockerRecord | null> {
    if (!(await this.findEntity(data.entityUid, userId))) return null;
    const now = new Date();
    const record = { ...data, createdAt: now, updatedAt: now };
    records.push(record);
    return record;
  }

  async findRecords(entityUid: string | undefined, userId: number): Promise<LockerRecord[]> {
    const ownedEntityUids = new Set((await this.findEntities(userId)).map(entity => entity.uid));
    return records.filter(record => ownedEntityUids.has(record.entityUid) && (!entityUid || record.entityUid === entityUid));
  }

  async findRecord(uid: string, userId: number): Promise<LockerRecord | null> {
    return (await this.findRecords(undefined, userId)).find(record => record.uid === uid) ?? null;
  }

  async updateRecord(uid: string, data: LockerRecordUpdateData, userId: number): Promise<LockerRecord | null> {
    const record = await this.findRecord(uid, userId);
    if (!record) return null;
    Object.assign(record, data, { updatedAt: new Date() });
    return record;
  }

  async deleteRecord(uid: string, userId: number): Promise<void> {
    const record = await this.findRecord(uid, userId);
    if (record) records = records.filter(item => item.uid !== record.uid);
  }
}
