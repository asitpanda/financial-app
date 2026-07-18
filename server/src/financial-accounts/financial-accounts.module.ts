import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FinancialAccountsController } from './financial-accounts.controller';
import { FinancialAccountsService } from './financial-accounts.service';
import { MockFinancialAccountRepository } from './repositories/mock-financial-account.repository';

@Module({
  imports: [ConfigModule],
  controllers: [FinancialAccountsController],
  providers: [
    MockFinancialAccountRepository,
    {
      provide: 'FINANCIAL_ACCOUNT_REPOSITORY',
      useFactory: (
        configService: ConfigService,
        mockRepo: MockFinancialAccountRepository,
      ) => {
        const dbProvider = configService.get('DB_PROVIDER', 'mock');
        console.log(`🏦 Financial accounts using ${dbProvider} repository`);
        return mockRepo;
      },
      inject: [ConfigService, MockFinancialAccountRepository],
    },
    FinancialAccountsService,
  ],
  exports: [FinancialAccountsService, MockFinancialAccountRepository],
})
export class FinancialAccountsModule {}
