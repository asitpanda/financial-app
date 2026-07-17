import { Module } from '@nestjs/common';
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
import { ValuationSnapshotsModule } from './valuation-snapshots/valuation-snapshots.module';

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
    ValuationSnapshotsModule,
  ],
})
export class AppModule {}
