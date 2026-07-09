import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { MockGoalRepository } from './repositories/mock-goal.repository';
import { SupabaseGoalRepository } from './repositories/supabase-goal.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [GoalsController],
  providers: [
    {
      provide: 'GOAL_REPOSITORY',
      useFactory: (configService: ConfigService) => {
        const dbProvider = configService.get('DB_PROVIDER', 'mock');
        console.log(`🎯 Goals using ${dbProvider} repository`);
        
        switch (dbProvider) {
          case 'supabase':
            return new SupabaseGoalRepository(null); // Will be injected
          case 'mock':
          default:
            return new MockGoalRepository();
        }
      },
      inject: [ConfigService],
    },
    GoalsService,
  ],
})
export class GoalsModule {}
