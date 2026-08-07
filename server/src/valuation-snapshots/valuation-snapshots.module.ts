import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { createProviderBackedBinding } from '../database/db-provider';
import { InvestmentMockRepository } from '../investments/repositories/investment.mock.repository';
import { InvestmentPrismaRepository } from '../investments/repositories/investment.prisma.repository';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { ValuationSnapshotMockRepository } from './repositories/valuation-snapshot.mock.repository';
import { ValuationSnapshotPrismaRepository } from './repositories/valuation-snapshot.prisma.repository';
import { ValuationSnapshotRepository } from './repositories/valuation-snapshot.repository';
import { ValuationSnapshotsService } from './valuation-snapshots.service';
import { ValuationSnapshotsController } from './valuation-snapshots.controller';

@Module({
  imports: [ConfigModule, DatabaseModule],
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
    ValuationSnapshotPrismaRepository,
    ValuationSnapshotMockRepository,
    createProviderBackedBinding({
      token: 'VALUATION_SNAPSHOT_DATA_SOURCE',
      databaseToken: ValuationSnapshotPrismaRepository,
      mockToken: ValuationSnapshotMockRepository,
      logLabel: '📸 Valuation snapshots',
    }),
    ValuationSnapshotRepository,
    ValuationSnapshotsService,
  ],
  controllers: [ValuationSnapshotsController],
  exports: [ValuationSnapshotsService],
})
export class ValuationSnapshotsModule {}
