import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { createProviderBackedBinding } from '../database/db-provider';
import { LockerController } from './locker.controller';
import { LockerService } from './locker.service';
import { LockerMockRepository } from './repositories/locker.mock.repository';
import { LockerPrismaRepository } from './repositories/locker.prisma.repository';
import { LockerRepository } from './repositories/locker.repository';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [LockerController],
  providers: [
    LockerPrismaRepository,
    LockerMockRepository,
    createProviderBackedBinding({
      token: 'LOCKER_DATA_SOURCE',
      databaseToken: LockerPrismaRepository,
      mockToken: LockerMockRepository,
      logLabel: 'Locker',
    }),
    LockerRepository,
    LockerService,
  ],
  exports: [LockerService],
})
export class LockerModule {}
