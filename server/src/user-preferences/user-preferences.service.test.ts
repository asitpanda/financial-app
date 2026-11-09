import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserPreferencesDataSource } from './repositories/user-preferences.datasource.port';
import { DEFAULT_USER_PREFERENCES } from './user-preferences.types';
import { UserPreferencesService } from './user-preferences.service';

function createService() {
  const repository = {
    find: vi.fn(),
    update: vi.fn(),
  };

  return {
    service: new UserPreferencesService(repository as unknown as UserPreferencesDataSource),
    repository,
  };
}

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let repository: ReturnType<typeof createService>['repository'];

  beforeEach(() => {
    ({ service, repository } = createService());
  });

  describe('get', () => {
    it('returns defaults when no preferences have been saved', async () => {
      repository.find.mockResolvedValue(null);

      await expect(service.get(42)).resolves.toEqual(DEFAULT_USER_PREFERENCES);
      expect(repository.find).toHaveBeenCalledExactlyOnceWith(42);
    });

    it('overlays saved preferences on defaults without mutating the shared defaults', async () => {
      repository.find.mockResolvedValue({ themeMode: 'dark' } as never);

      await expect(service.get(42)).resolves.toEqual({
        currencyDisplay: 'symbol',
        themeMode: 'dark',
        dateFormat: 'DD_MM_YYYY',
      });
      expect(DEFAULT_USER_PREFERENCES).toEqual({
        currencyDisplay: 'symbol',
        themeMode: 'light',
        dateFormat: 'DD_MM_YYYY',
      });
    });
  });

  describe('update', () => {
    it('forwards only defined preference fields and returns the persisted result', async () => {
      const saved = { currencyDisplay: 'code', themeMode: 'dark', dateFormat: 'YYYY_MM_DD' } as const;
      repository.update.mockResolvedValue(saved);

      await expect(service.update(42, {
        currencyDisplay: 'code',
        themeMode: undefined,
        dateFormat: 'YYYY_MM_DD',
        unknownPreference: 'ignored',
      } as never)).resolves.toEqual(saved);
      expect(repository.update).toHaveBeenCalledExactlyOnceWith(42, {
        currencyDisplay: 'code',
        dateFormat: 'YYYY_MM_DD',
      });
    });

    it('forwards an empty patch without inventing preference changes', async () => {
      repository.update.mockResolvedValue(DEFAULT_USER_PREFERENCES);

      await expect(service.update(42, {})).resolves.toEqual(DEFAULT_USER_PREFERENCES);
      expect(repository.update).toHaveBeenCalledExactlyOnceWith(42, {});
    });
  });
});