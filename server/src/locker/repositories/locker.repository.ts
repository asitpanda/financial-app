import { Inject, Injectable } from '@nestjs/common';
import type {
  ILockerDataSourcePort,
  LockerEntityCreateData,
  LockerEntityUpdateData,
  LockerRecordCreateData,
  LockerRecordUpdateData,
} from './locker.datasource.port';
import type { LockerEntity, LockerRecord } from '../locker.types';

@Injectable()
export class LockerRepository {
  constructor(@Inject('LOCKER_DATA_SOURCE') private readonly dataSource: ILockerDataSourcePort) {}

  createEntity(data: LockerEntityCreateData, userId: number): Promise<LockerEntity> {
    return this.dataSource.createEntity(data, userId);
  }

  findEntities(userId: number): Promise<LockerEntity[]> {
    return this.dataSource.findEntities(userId);
  }

  findEntity(uid: string, userId: number): Promise<LockerEntity | null> {
    return this.dataSource.findEntity(uid, userId);
  }

  updateEntity(uid: string, data: LockerEntityUpdateData, userId: number): Promise<LockerEntity | null> {
    return this.dataSource.updateEntity(uid, data, userId);
  }

  deleteEntity(uid: string, userId: number): Promise<void> {
    return this.dataSource.deleteEntity(uid, userId);
  }

  createRecord(data: LockerRecordCreateData, userId: number): Promise<LockerRecord | null> {
    return this.dataSource.createRecord(data, userId);
  }

  findRecords(entityUid: string | undefined, userId: number): Promise<LockerRecord[]> {
    return this.dataSource.findRecords(entityUid, userId);
  }

  findRecord(uid: string, userId: number): Promise<LockerRecord | null> {
    return this.dataSource.findRecord(uid, userId);
  }

  updateRecord(uid: string, data: LockerRecordUpdateData, userId: number): Promise<LockerRecord | null> {
    return this.dataSource.updateRecord(uid, data, userId);
  }

  deleteRecord(uid: string, userId: number): Promise<void> {
    return this.dataSource.deleteRecord(uid, userId);
  }
}
