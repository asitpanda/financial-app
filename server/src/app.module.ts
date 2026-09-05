import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TransactionsModule } from './transactions/transactions.module';
import { GoalsModule } from './goals/goals.module';
import { CategoriesModule } from './categories/categories.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { InvestmentsModule } from './investments/investments.module';
import { InvestmentAssetTaxonomyModule } from './investment-asset-taxonomy/investment-asset-taxonomy.module';
import { InvestmentContributionPlansModule } from './investment-contribution-plans/investment-contribution-plans.module';
import { InvestmentEventsModule } from './investment-events/investment-events.module';
import { InvestmentBenefitsModule } from './investment-benefits/investment-benefits.module';
import { ValuationSnapshotsModule } from './valuation-snapshots/valuation-snapshots.module';
import { FinancialAccountsModule } from './financial-accounts/financial-accounts.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
