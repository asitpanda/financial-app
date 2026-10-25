import { GLOBAL_MODULE_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { PrismaService } from './prisma.service';
import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  it('globally provides and exports PrismaService', () => {
    expect(Reflect.getMetadata(GLOBAL_MODULE_METADATA, DatabaseModule)).toBe(true);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, DatabaseModule)).toContain(PrismaService);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, DatabaseModule)).toContain(PrismaService);
  });
});