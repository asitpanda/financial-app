import type { UserPreferences } from '../user-preferences.types';

export abstract class UserPreferencesDataSource {
  abstract find(userId: number): Promise<UserPreferences | null>;
  abstract update(userId: number, patch: Partial<UserPreferences>): Promise<UserPreferences>;
}