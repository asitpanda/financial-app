import type { FactoryProvider, Provider } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseModule } from '../database/database.module';
import { LockerController } from './locker.controller';
import { LockerMockRepository } from './repositories/locker.mock.repository';
import { LockerPrismaRepository } from './repositories/locker.prisma.repository';
import { LockerRepository } from './repositories/locker.repository';
import { LockerModule } from './locker.module';
import { LockerService } from './locker.service';

describe('LockerModule', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the controller, service, repositories, and database dependencies', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, LockerModule) as unknown[];
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, LockerModule) as Provider[];
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, LockerModule) as unknown[];
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, LockerModule) as unknown[];

    expect(controllers).toContain(LockerController);
    expect(providers).toEqual(expect.arrayContaining([
      LockerService,
      LockerRepository,
      LockerPrismaRepository,
      LockerMockRepository,
    ]));
    expect(imports).toEqual(expect.arrayContaining([DatabaseModule]));
    expect(exports).toContain(LockerService);
  });

  it.each([
    ['mock', 'mock'],
    ['postgres', 'database'],
    ['supabase', 'database'],
  ] as const)('binds the %s provider to the %s locker data source', (dbProvider, expectedSource) => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, LockerModule) as Provider[];
    const binding = providers.find((provider) =>
      typeof provider === 'object' && provider !== null && 'provide' in provider &&
      provider.provide === 'LOCKER_DATA_SOURCE',
    ) as FactoryProvider;
    const databaseRepository = { kind: 'database' };
    const mockRepository = { kind: 'mock' };
    const factory = binding.useFactory as (...dependencies: unknown[]) => unknown;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(binding.inject).toEqual([ConfigService, LockerPrismaRepository, LockerMockRepository]);
    expect(factory(
      { get: vi.fn().mockReturnValue(dbProvider) } as unknown as ConfigService,
      databaseRepository,
      mockRepository,
    )).toBe(expectedSource === 'mock' ? mockRepository : databaseRepository);
  });
});