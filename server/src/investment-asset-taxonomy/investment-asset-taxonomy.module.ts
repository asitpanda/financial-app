import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InvestmentAssetTaxonomyController } from './investment-asset-taxonomy.controller';
import { InvestmentAssetTaxonomyService } from './investment-asset-taxonomy.service';
import { MockInvestmentAssetTaxonomyRepository } from './repositories/mock-investment-asset-taxonomy.repository';

@Module({
  imports: [ConfigModule],
  controllers: [InvestmentAssetTaxonomyController],
  providers: [
    MockInvestmentAssetTaxonomyRepository,
    {
      provide: 'INVESTMENT_ASSET_TAXONOMY_REPOSITORY',
      useFactory: (configService: ConfigService, mockRepo: MockInvestmentAssetTaxonomyRepository) => {
        const dbProvider = configService.get('DB_PROVIDER', 'mock');
        console.log(`🗂️ Investment asset taxonomy using ${dbProvider} repository`);
        return mockRepo;
      },
      inject: [ConfigService, MockInvestmentAssetTaxonomyRepository],
    },
    InvestmentAssetTaxonomyService,
  ],
})
export class InvestmentAssetTaxonomyModule {}