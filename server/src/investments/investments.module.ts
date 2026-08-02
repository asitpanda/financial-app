import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvestmentContributionPlansModule } from '../investment-contribution-plans/investment-contribution-plans.module';
import { ValuationSnapshotsModule } from '../valuation-snapshots/valuation-snapshots.module';
import { DatabaseModule } from '../database/database.module';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { InvestmentMockRepository } from './repositories/investment.mock.repository';
import { InvestmentPrismaRepository } from './repositories/investment.prisma.repository';
import { InvestmentRepository } from './repositories/investment.repository';
import { createProviderBackedBinding } from '../database/db-provider';

@Module({
  imports: [ConfigModule, DatabaseModule, InvestmentContributionPlansModule, ValuationSnapshotsModule],
  controllers: [InvestmentsController],
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
    InvestmentsService,
  ],
})
export class InvestmentsModule {}