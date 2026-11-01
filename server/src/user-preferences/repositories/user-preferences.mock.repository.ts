import { Injectable } from '@nestjs/common';
import { DEFAULT_USER_PREFERENCES, UserPreferences } from '../user-preferences.types';
import { UserPreferencesDataSource } from './user-preferences.datasource.port';

@Injectable()
export class UserPreferencesMockRepository implements UserPreferencesDataSource {
  private readonly preferences = new Map<number, UserPreferences>();

  async find(userId: number): Promise<UserPreferences | null> {
    const saved = this.preferences.get(userId);
    return saved ? { ...saved } : null;
  }

  async update(userId: number, patch: Partial<UserPreferences>): Promise<UserPreferences> {
    const saved = { ...DEFAULT_USER_PREFERENCES, ...this.preferences.get(userId), ...patch };
    this.preferences.set(userId, saved);
    return { ...saved };
  }
}