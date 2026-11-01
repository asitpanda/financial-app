import { Inject, Injectable } from '@nestjs/common';
import { UserPreferencesDataSource } from './repositories/user-preferences.datasource.port';
import { DEFAULT_USER_PREFERENCES, UserPreferences } from './user-preferences.types';

@Injectable()
export class UserPreferencesService {
  constructor(
    @Inject('USER_PREFERENCES_DATA_SOURCE')
    private readonly repository: UserPreferencesDataSource,
  ) {}

  async get(userId: number): Promise<UserPreferences> {
    return { ...DEFAULT_USER_PREFERENCES, ...await this.repository.find(userId) };
  }

  update(userId: number, patch: Partial<UserPreferences>): Promise<UserPreferences> {
    const changes: Partial<UserPreferences> = {};
    if (patch.currencyDisplay !== undefined) changes.currencyDisplay = patch.currencyDisplay;
    if (patch.themeMode !== undefined) changes.themeMode = patch.themeMode;
    if (patch.dateFormat !== undefined) changes.dateFormat = patch.dateFormat;
    return this.repository.update(userId, changes);
  }
}