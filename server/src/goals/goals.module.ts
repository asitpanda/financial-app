import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { GoalMockRepository } from './repositories/goal.mock.repository';
import { GoalPrismaRepository } from './repositories/goal.prisma.repository';
import { GoalRepository } from './repositories/goal.repository';
import { DatabaseModule } from '../database/database.module';
import { createProviderBackedBinding } from '../database/db-provider';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [GoalsController],
  providers: [
    GoalPrismaRepository,
    GoalMockRepository,
    createProviderBackedBinding({
      token: 'GOAL_DATA_SOURCE',
      databaseToken: GoalPrismaRepository,
      mockToken: GoalMockRepository,
      logLabel: '🎯 Goals',
    }),
    GoalRepository,
    GoalsService,
  ],
})
export class GoalsModule {}
