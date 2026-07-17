import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvestmentContributionPlansModule } from '../investment-contribution-plans/investment-contribution-plans.module';
import { ValuationSnapshotsModule } from '../valuation-snapshots/valuation-snapshots.module';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { MockInvestmentRepository } from './repositories/mock-investment.repository';

@Module({
  imports: [ConfigModule, InvestmentContributionPlansModule, ValuationSnapshotsModule],
  controllers: [InvestmentsController],
  providers: [
    MockInvestmentRepository,
    {
      provide: 'INVESTMENT_REPOSITORY',
      useFactory: (configService: ConfigService, mockRepo: MockInvestmentRepository) => {
        const dbProvider = configService.get('DB_PROVIDER', 'mock');
        console.log(`📈 Investments using ${dbProvider} repository`);
        return mockRepo;
      },
      inject: [ConfigService, MockInvestmentRepository],
    },
    InvestmentsService,
  ],
})
export class InvestmentsModule {}