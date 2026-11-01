import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { UserPreferences } from '../user-preferences.types';
import { UserPreferencesDataSource } from './user-preferences.datasource.port';

@Injectable()
export class UserPreferencesPrismaRepository implements UserPreferencesDataSource {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: number): Promise<UserPreferences | null> {
    return this.prisma.userPreferences.findUnique({
      where: { userId },
      select: { currencyDisplay: true, themeMode: true, dateFormat: true },
    });
  }

  async update(userId: number, patch: Partial<UserPreferences>): Promise<UserPreferences> {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: patch,
      select: { currencyDisplay: true, themeMode: true, dateFormat: true },
    });
  }
}