import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './database/database.module';
import { FinancialAccountsModule } from './financial-accounts/financial-accounts.module';
import { GoalsModule } from './goals/goals.module';
import { InvestmentAssetTaxonomyModule } from './investment-asset-taxonomy/investment-asset-taxonomy.module';
import { InvestmentBenefitsModule } from './investment-benefits/investment-benefits.module';
import { InvestmentContributionPlansModule } from './investment-contribution-plans/investment-contribution-plans.module';
import { InvestmentEventsModule } from './investment-events/investment-events.module';
import { InvestmentsModule } from './investments/investments.module';
import { LockerModule } from './locker/locker.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ValuationSnapshotsModule } from './valuation-snapshots/valuation-snapshots.module';

describe('AppModule', () => {
  it('registers global configuration and every application feature module', async () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as unknown[];
    const [configModule, ...featureModules] = await Promise.all(imports);

    expect(configModule).toMatchObject({ module: ConfigModule, global: true });
    expect(featureModules).toEqual([
      DatabaseModule,
      AuthModule,
      TransactionsModule,
      GoalsModule,
      CategoriesModule,
      InvestmentsModule,
      InvestmentAssetTaxonomyModule,
      InvestmentContributionPlansModule,
      InvestmentEventsModule,
      InvestmentBenefitsModule,
      ValuationSnapshotsModule,
      FinancialAccountsModule,
      LockerModule,
    ]);
  });

  it('applies JwtAuthGuard as the global application guard', () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) as Array<{
      provide: unknown;
      useClass: unknown;
    }>;

    expect(providers).toContainEqual({ provide: APP_GUARD, useClass: JwtAuthGuard });
  });
});