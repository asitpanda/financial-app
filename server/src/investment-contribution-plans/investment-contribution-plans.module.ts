import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvestmentContributionPlansController } from './investment-contribution-plans.controller';
import { InvestmentContributionPlansService } from './investment-contribution-plans.service';
import { MockInvestmentContributionPlanRepository } from './repositories/mock-investment-contribution-plan.repository';

@Module({
  imports: [ConfigModule],
  controllers: [InvestmentContributionPlansController],
  providers: [
    MockInvestmentContributionPlanRepository,
    {
      provide: 'INVESTMENT_CONTRIBUTION_PLAN_REPOSITORY',
      useFactory: (configService: ConfigService, mockRepo: MockInvestmentContributionPlanRepository) => {
        const dbProvider = configService.get('DB_PROVIDER', 'mock');
        console.log(`📆 Investment contribution plans using ${dbProvider} repository`);
        return mockRepo;
      },
      inject: [ConfigService, MockInvestmentContributionPlanRepository],
    },
    InvestmentContributionPlansService,
  ],
  exports: [MockInvestmentContributionPlanRepository, InvestmentContributionPlansService],
})
export class InvestmentContributionPlansModule {}