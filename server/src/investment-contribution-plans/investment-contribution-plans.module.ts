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
import { FinancialAccountsModule } from '../financial-accounts/financial-accounts.module';
import { InvestmentMockRepository } from '../investments/repositories/investment.mock.repository';
import { InvestmentPrismaRepository } from '../investments/repositories/investment.prisma.repository';
import { InvestmentRepository } from '../investments/repositories/investment.repository';

@Module({
  imports: [ConfigModule, DatabaseModule, FinancialAccountsModule],
  controllers: [InvestmentContributionPlansController],
  providers: [
    InvestmentPrismaRepository,
    InvestmentMockRepository,
    createProviderBackedBinding({
      token: 'INVESTMENT_DATA_SOURCE',
      databaseToken: InvestmentPrismaRepository,
      mockToken: InvestmentMockRepository,
      logLabel: '📈 Investments',
    }),
    InvestmentRepository,
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