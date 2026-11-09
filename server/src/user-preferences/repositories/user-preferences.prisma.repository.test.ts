import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { UserPreferencesPrismaRepository } from './user-preferences.prisma.repository';

function createRepository() {
  const prisma = {
    userPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };

  return {
    repository: new UserPreferencesPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

describe('UserPreferencesPrismaRepository', () => {
  let repository: UserPreferencesPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('find', () => {
    it('selects only preference fields for the requested user', async () => {
      const preferences = { currencyDisplay: 'code', themeMode: 'dark', dateFormat: 'YYYY_MM_DD' } as const;
      prisma.userPreferences.findUnique.mockResolvedValue(preferences);

      await expect(repository.find(42)).resolves.toEqual(preferences);
      expect(prisma.userPreferences.findUnique).toHaveBeenCalledExactlyOnceWith({
        where: { userId: 42 },
        select: { currencyDisplay: true, themeMode: true, dateFormat: true },
      });
    });

    it('returns null when the user has no preference record', async () => {
      prisma.userPreferences.findUnique.mockResolvedValue(null);

      await expect(repository.find(42)).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('upserts only the supplied preference patch and returns the selected fields', async () => {
      const patch = { themeMode: 'dark' as const };
      const preferences = { currencyDisplay: 'symbol', themeMode: 'dark', dateFormat: 'DD_MM_YYYY' } as const;
      prisma.userPreferences.upsert.mockResolvedValue(preferences);

      await expect(repository.update(42, patch)).resolves.toEqual(preferences);
      expect(prisma.userPreferences.upsert).toHaveBeenCalledExactlyOnceWith({
        where: { userId: 42 },
        create: { userId: 42, ...patch },
        update: patch,
        select: { currencyDisplay: true, themeMode: true, dateFormat: true },
      });
    });

    it('sends an empty patch unchanged when no preference fields are updated', async () => {
      const preferences = { currencyDisplay: 'symbol', themeMode: 'light', dateFormat: 'DD_MM_YYYY' } as const;
      prisma.userPreferences.upsert.mockResolvedValue(preferences);

      await expect(repository.update(42, {})).resolves.toEqual(preferences);
      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 42 },
        create: { userId: 42 },
        update: {},
        select: { currencyDisplay: true, themeMode: true, dateFormat: true },
      });
    });
  });
});