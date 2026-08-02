import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { InvestmentContributionPlansController } from './investment-contribution-plans.controller';
import { InvestmentContributionPlansService } from './investment-contribution-plans.service';
import { ContributionPlanMockRepository } from './repositories/contribution-plan.mock.repository';
import { ContributionPlanPrismaRepository } from './repositories/contribution-plan.prisma.repository';
import { ContributionPlanRepository } from './repositories/contribution-plan.repository';
import { createProviderBackedBinding } from '../database/db-provider';
import { RecurringScheduleCalculator } from './recurring-schedule-calculator.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [InvestmentContributionPlansController],
  providers: [
    ContributionPlanPrismaRepository,
    ContributionPlanMockRepository,
    createProviderBackedBinding({
      token: 'INVESTMENT_CONTRIBUTION_PLAN_DATA_SOURCE',
      databaseToken: ContributionPlanPrismaRepository,
      mockToken: ContributionPlanMockRepository,
      logLabel: '📆 Investment contribution plans',
    }),
    ContributionPlanRepository,
    RecurringScheduleCalculator,
    InvestmentContributionPlansService,
  ],
  exports: [InvestmentContributionPlansService],
})
export class InvestmentContributionPlansModule {}