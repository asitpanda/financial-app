import type { FactoryProvider, Provider } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategoriesModule } from '../categories/categories.module';
import { FinancialAccountsModule } from '../financial-accounts/financial-accounts.module';
import { InvestmentContributionPlansModule } from '../investment-contribution-plans/investment-contribution-plans.module';
import { InvestmentEventsModule } from '../investment-events/investment-events.module';
import { InvestmentsModule } from '../investments/investments.module';
import { TransactionMockRepository } from './repositories/transaction.mock.repository';
import { TransactionPrismaRepository } from './repositories/transaction.prisma.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionsController } from './transactions.controller';
import { TransactionsModule } from './transactions.module';
import { TransactionsService } from './transactions.service';

describe('TransactionsModule', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers its controller, service, repository, and feature dependencies', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, TransactionsModule) as unknown[];
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, TransactionsModule) as Provider[];
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, TransactionsModule) as unknown[];

    expect(controllers).toContain(TransactionsController);
    expect(providers).toEqual(expect.arrayContaining([
      TransactionsService,
      TransactionRepository,
      TransactionPrismaRepository,
      TransactionMockRepository,
    ]));
    expect(imports).toEqual(expect.arrayContaining([
      InvestmentEventsModule,
      InvestmentContributionPlansModule,
      InvestmentsModule,
      CategoriesModule,
      FinancialAccountsModule,
    ]));
  });

  it.each([
    ['mock', 'mock'],
    ['postgres', 'database'],
    ['supabase', 'database'],
  ] as const)('binds the %s provider to the %s transaction data source', (dbProvider, expectedSource) => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, TransactionsModule) as Provider[];
    const binding = providers.find((provider) =>
      typeof provider === 'object' && provider !== null && 'provide' in provider &&
      provider.provide === 'TRANSACTION_DATA_SOURCE',
    ) as FactoryProvider;
    const databaseRepository = { kind: 'database' };
    const mockRepository = { kind: 'mock' };
    const factory = binding.useFactory as (...dependencies: unknown[]) => unknown;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(binding.inject).toEqual([ConfigService, TransactionPrismaRepository, TransactionMockRepository]);
    expect(factory(
      { get: vi.fn().mockReturnValue(dbProvider) } as unknown as ConfigService,
      databaseRepository,
      mockRepository,
    )).toBe(expectedSource === 'mock' ? mockRepository : databaseRepository);
  });
});