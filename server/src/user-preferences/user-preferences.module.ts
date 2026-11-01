import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { createProviderBackedBinding } from '../database/db-provider';
import { UserPreferencesMockRepository } from './repositories/user-preferences.mock.repository';
import { UserPreferencesPrismaRepository } from './repositories/user-preferences.prisma.repository';
import { UserPreferencesController } from './user-preferences.controller';
import { UserPreferencesService } from './user-preferences.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [UserPreferencesController],
  providers: [
    UserPreferencesMockRepository,
    UserPreferencesPrismaRepository,
    createProviderBackedBinding({
      token: 'USER_PREFERENCES_DATA_SOURCE',
      databaseToken: UserPreferencesPrismaRepository,
      mockToken: UserPreferencesMockRepository,
    }),
    UserPreferencesService,
  ],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}