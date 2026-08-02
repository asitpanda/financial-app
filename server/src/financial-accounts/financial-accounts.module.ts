import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { FinancialAccountsController } from './financial-accounts.controller';
import { FinancialAccountsService } from './financial-accounts.service';
import { FinancialAccountMockRepository } from './repositories/financial-account.mock.repository';
import { FinancialAccountPrismaRepository } from './repositories/financial-account.prisma.repository';
import { FinancialAccountRepository } from './repositories/financial-account.repository';
import { createProviderBackedBinding } from '../database/db-provider';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [FinancialAccountsController],
  providers: [
    FinancialAccountPrismaRepository,
    FinancialAccountMockRepository,
    createProviderBackedBinding({
      token: 'FINANCIAL_ACCOUNT_DATA_SOURCE',
      databaseToken: FinancialAccountPrismaRepository,
      mockToken: FinancialAccountMockRepository,
      logLabel: '🏦 Financial accounts',
    }),
    FinancialAccountRepository,
    FinancialAccountsService,
  ],
  exports: [FinancialAccountsService],
})
export class FinancialAccountsModule {}
