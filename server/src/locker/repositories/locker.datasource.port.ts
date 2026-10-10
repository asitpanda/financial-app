import type { LockerEntity, LockerField, LockerRecord } from '../locker.types';

export interface LockerEntityCreateData {
  uid: string;
  label: string;
  fields: LockerField[];
}

export interface LockerEntityUpdateData {
  label?: string;
  fields?: LockerField[];
}

export interface LockerRecordCreateData {
  uid: string;
  entityUid: string;
  label: string;
  values: Record<string, string | null>;
}

export interface LockerRecordUpdateData {
  label?: string;
  values?: Record<string, string | null>;
}

export interface ILockerDataSourcePort {
  createEntity(data: LockerEntityCreateData, userId: number): Promise<LockerEntity>;
  findEntities(userId: number): Promise<LockerEntity[]>;
  findEntity(uid: string, userId: number): Promise<LockerEntity | null>;
  updateEntity(uid: string, data: LockerEntityUpdateData, userId: number): Promise<LockerEntity | null>;
  deleteEntity(uid: string, userId: number): Promise<void>;
  createRecord(data: LockerRecordCreateData, userId: number): Promise<LockerRecord | null>;
  findRecords(entityUid: string | undefined, userId: number): Promise<LockerRecord[]>;
  findRecord(uid: string, userId: number): Promise<LockerRecord | null>;
  updateRecord(uid: string, data: LockerRecordUpdateData, userId: number): Promise<LockerRecord | null>;
  deleteRecord(uid: string, userId: number): Promise<void>;
}
