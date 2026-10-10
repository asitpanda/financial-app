import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { LockerEntity, LockerField, LockerRecord } from '../locker.types';
import type {
  ILockerDataSourcePort,
  LockerEntityCreateData,
  LockerEntityUpdateData,
  LockerRecordCreateData,
  LockerRecordUpdateData,
} from './locker.datasource.port';

const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

type LockerPrismaService = PrismaService & {
  lockerEntity: Prisma.LockerEntityDelegate;
  lockerRecord: Prisma.LockerRecordDelegate;
};

const mapEntity = (row: { uid: string; userId: number; label: string; fields: Prisma.JsonValue; createdAt: Date; updatedAt: Date }): LockerEntity => ({
  ...row,
  fields: row.fields as unknown as LockerField[],
});

const mapRecord = (row: { uid: string; entityUid: string; label: string; values: Prisma.JsonValue; createdAt: Date; updatedAt: Date }): LockerRecord => ({
  ...row,
  values: row.values as Record<string, string | null>,
});

@Injectable()
export class LockerPrismaRepository implements ILockerDataSourcePort {
  constructor(@Inject(PrismaService) private readonly prisma: LockerPrismaService) {}

  async createEntity(data: LockerEntityCreateData, userId: number): Promise<LockerEntity> {
    const entity = await this.prisma.lockerEntity.create({
      data: { uid: data.uid, userId, label: data.label, fields: toJson(data.fields) },
    });
    return mapEntity(entity);
  }

  async findEntities(userId: number): Promise<LockerEntity[]> {
    const entities = await this.prisma.lockerEntity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return entities.map(mapEntity);
  }

  async findEntity(uid: string, userId: number): Promise<LockerEntity | null> {
    const entity = await this.prisma.lockerEntity.findFirst({ where: { uid, userId } });
    return entity ? mapEntity(entity) : null;
  }

  async updateEntity(uid: string, data: LockerEntityUpdateData, userId: number): Promise<LockerEntity | null> {
    const existing = await this.prisma.lockerEntity.findFirst({ where: { uid, userId } });
    if (!existing) return null;

    const entity = await this.prisma.lockerEntity.update({
      where: { uid },
      data: {
        ...(data.label === undefined ? {} : { label: data.label }),
        ...(data.fields === undefined ? {} : { fields: toJson(data.fields) }),
      },
    });
    return mapEntity(entity);
  }

  async deleteEntity(uid: string, userId: number): Promise<void> {
    const existing = await this.prisma.lockerEntity.findFirst({ where: { uid, userId } });
    if (existing) await this.prisma.lockerEntity.delete({ where: { uid } });
  }

  async createRecord(data: LockerRecordCreateData, userId: number): Promise<LockerRecord | null> {
    const entity = await this.prisma.lockerEntity.findFirst({ where: { uid: data.entityUid, userId }, select: { uid: true } });
    if (!entity) return null;

    const record = await this.prisma.lockerRecord.create({
      data: { uid: data.uid, entityUid: data.entityUid, label: data.label, values: toJson(data.values) },
    });
    return mapRecord(record);
  }

  async findRecords(entityUid: string | undefined, userId: number): Promise<LockerRecord[]> {
    const records = await this.prisma.lockerRecord.findMany({
      where: { ...(entityUid ? { entityUid } : {}), entity: { userId } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapRecord);
  }

  async findRecord(uid: string, userId: number): Promise<LockerRecord | null> {
    const record = await this.prisma.lockerRecord.findFirst({ where: { uid, entity: { userId } } });
    return record ? mapRecord(record) : null;
  }

  async updateRecord(uid: string, data: LockerRecordUpdateData, userId: number): Promise<LockerRecord | null> {
    const existing = await this.findRecord(uid, userId);
    if (!existing) return null;

    const record = await this.prisma.lockerRecord.update({
      where: { uid },
      data: {
        ...(data.label === undefined ? {} : { label: data.label }),
        ...(data.values === undefined ? {} : { values: toJson(data.values) }),
      },
    });
    return mapRecord(record);
  }

  async deleteRecord(uid: string, userId: number): Promise<void> {
    const existing = await this.findRecord(uid, userId);
    if (existing) await this.prisma.lockerRecord.delete({ where: { uid } });
  }
}
