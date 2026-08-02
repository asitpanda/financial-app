import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { InvestmentAssetTaxonomyController } from './investment-asset-taxonomy.controller';
import { InvestmentAssetTaxonomyService } from './investment-asset-taxonomy.service';
import { AssetTaxonomyMockRepository } from './repositories/asset-taxonomy.mock.repository';
import { AssetTaxonomyPrismaRepository } from './repositories/asset-taxonomy.prisma.repository';
import { AssetTaxonomyRepository } from './repositories/asset-taxonomy.repository';
import { createProviderBackedBinding } from '../database/db-provider';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [InvestmentAssetTaxonomyController],
  providers: [
    AssetTaxonomyPrismaRepository,
    AssetTaxonomyMockRepository,
    createProviderBackedBinding({
      token: 'INVESTMENT_ASSET_TAXONOMY_DATA_SOURCE',
      databaseToken: AssetTaxonomyPrismaRepository,
      mockToken: AssetTaxonomyMockRepository,
      logLabel: '🗂️ Investment asset taxonomy',
    }),
    AssetTaxonomyRepository,
    InvestmentAssetTaxonomyService,
  ],
})
export class InvestmentAssetTaxonomyModule {}