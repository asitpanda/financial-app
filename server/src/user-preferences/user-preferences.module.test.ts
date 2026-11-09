import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferencesModule } from './user-preferences.module';

async function createModule(dbProvider: string) {
  const prisma = {
    userPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      UserPreferencesModule,
    ],
  })
    .overrideProvider(ConfigService)
    .useValue({ get: (key: string) => key === 'DB_PROVIDER' ? dbProvider : undefined })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  return { moduleRef, prisma, preferences: moduleRef.get(UserPreferencesService) };
}

describe('UserPreferencesModule', () => {
  let moduleRef: Awaited<ReturnType<typeof createModule>>['moduleRef'] | undefined;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  it('exports a service backed by isolated in-memory preferences for the mock provider', async () => {
    const setup = await createModule('mock');
    moduleRef = setup.moduleRef;

    await setup.preferences.update(42, { currencyDisplay: 'code' });

    await expect(setup.preferences.get(42)).resolves.toEqual({
      currencyDisplay: 'code',
      themeMode: 'light',
      dateFormat: 'DD_MM_YYYY',
    });
    expect(setup.prisma.userPreferences.findUnique).not.toHaveBeenCalled();
    expect(setup.prisma.userPreferences.upsert).not.toHaveBeenCalled();
  });

  it('exports a service backed by the Prisma repository for a database provider', async () => {
    const persistedPreferences = {
      currencyDisplay: 'code',
      themeMode: 'dark',
      dateFormat: 'YYYY_MM_DD',
    } as const;
    const setup = await createModule('postgres');
    moduleRef = setup.moduleRef;
    setup.prisma.userPreferences.findUnique.mockResolvedValue(persistedPreferences);
    setup.prisma.userPreferences.upsert.mockResolvedValue(persistedPreferences);

    await expect(setup.preferences.get(42)).resolves.toEqual(persistedPreferences);
    await expect(setup.preferences.update(42, { themeMode: 'dark' })).resolves.toEqual(persistedPreferences);
    expect(setup.prisma.userPreferences.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 42 },
      select: { currencyDisplay: true, themeMode: true, dateFormat: true },
    });
    expect(setup.prisma.userPreferences.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 42 },
      create: { userId: 42, themeMode: 'dark' },
      update: { themeMode: 'dark' },
      select: { currencyDisplay: true, themeMode: true, dateFormat: true },
    });
  });
});