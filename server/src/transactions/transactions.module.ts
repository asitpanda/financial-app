import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionPrismaRepository } from './repositories/transaction.prisma.repository';
import { TransactionMockRepository } from './repositories/transaction.mock.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { InvestmentEventsModule } from '../investment-events/investment-events.module';
import { InvestmentContributionPlansModule } from '../investment-contribution-plans/investment-contribution-plans.module';
import { InvestmentsModule } from '../investments/investments.module';
import { createProviderBackedBinding } from '../database/db-provider';

@Module({
  imports: [
    InvestmentEventsModule,
    InvestmentContributionPlansModule,
    InvestmentsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionPrismaRepository,
    TransactionMockRepository,
    createProviderBackedBinding({
      token: 'TRANSACTION_DATA_SOURCE',
      databaseToken: TransactionPrismaRepository,
      mockToken: TransactionMockRepository,
      logLabel: '💸 Transactions',
    }),
    TransactionRepository,
  ],
})
export class TransactionsModule {}
