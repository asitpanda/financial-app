import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_USER_PREFERENCES } from '../user-preferences.types';
import { UserPreferencesMockRepository } from './user-preferences.mock.repository';

describe('UserPreferencesMockRepository', () => {
  let repository: UserPreferencesMockRepository;

  beforeEach(() => {
    repository = new UserPreferencesMockRepository();
  });

  describe('find', () => {
    it('returns null for a user without saved preferences', async () => {
      await expect(repository.find(42)).resolves.toBeNull();
    });

    it('returns a copy of preferences so callers cannot mutate stored state', async () => {
      await repository.update(42, { themeMode: 'dark' });
      const preferences = await repository.find(42);
      preferences!.themeMode = 'light';

      await expect(repository.find(42)).resolves.toEqual({
        ...DEFAULT_USER_PREFERENCES,
        themeMode: 'dark',
      });
    });
  });

  describe('update', () => {
    it('creates a defaulted preference record and returns a detached copy', async () => {
      const updated = await repository.update(42, { currencyDisplay: 'code' });
      updated.themeMode = 'dark';

      await expect(repository.find(42)).resolves.toEqual({
        ...DEFAULT_USER_PREFERENCES,
        currencyDisplay: 'code',
      });
    });

    it('merges patches per user without overwriting existing fields or another user', async () => {
      await repository.update(42, { currencyDisplay: 'code', themeMode: 'dark' });
      await repository.update(7, { dateFormat: 'YYYY_MM_DD' });

      await expect(repository.update(42, { dateFormat: 'DD_MMM_YYYY' })).resolves.toEqual({
        currencyDisplay: 'code',
        themeMode: 'dark',
        dateFormat: 'DD_MMM_YYYY',
      });
      await expect(repository.find(7)).resolves.toEqual({
        ...DEFAULT_USER_PREFERENCES,
        dateFormat: 'YYYY_MM_DD',
      });
    });

    it('preserves defaults for an empty patch', async () => {
      await expect(repository.update(42, {})).resolves.toEqual(DEFAULT_USER_PREFERENCES);
    });
  });
});