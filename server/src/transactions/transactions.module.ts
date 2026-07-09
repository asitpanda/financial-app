import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { SupabaseTransactionRepository } from './repositories/supabase-transaction.repository';
import { MockTransactionRepository } from './repositories/mock-transaction.repository';
import { FirebaseTransactionRepository } from './repositories/firebase-transaction.repository';

@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    SupabaseTransactionRepository,
    MockTransactionRepository,
    FirebaseTransactionRepository,
    {
      provide: 'TRANSACTION_REPOSITORY',
      useFactory: (
        configService: ConfigService,
        supabaseRepo: SupabaseTransactionRepository,
        mockRepo: MockTransactionRepository,
        firebaseRepo: FirebaseTransactionRepository,
      ) => {
        const dbProvider = configService.get('DB_PROVIDER', 'mock');
        
        switch (dbProvider) {
          case 'supabase':
            return supabaseRepo;
          case 'firebase':
            return firebaseRepo;
          case 'mock':
          default:
            return mockRepo;
        }
      },
      inject: [
        ConfigService,
        SupabaseTransactionRepository,
        MockTransactionRepository,
        FirebaseTransactionRepository,
      ],
    },
  ],
})
export class TransactionsModule {}
