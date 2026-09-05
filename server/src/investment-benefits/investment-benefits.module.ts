import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { createProviderBackedBinding } from '../database/db-provider';
import { InvestmentMockRepository } from '../investments/repositories/investment.mock.repository';
import { InvestmentPrismaRepository } from '../investments/repositories/investment.prisma.repository';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { BenefitMockRepository } from './repositories/benefit.mock.repository';
import { BenefitPrismaRepository } from './repositories/benefit.prisma.repository';
import { BenefitRepository } from './repositories/benefit.repository';
import { InvestmentBenefitsController } from './investment-benefits.controller';
import { InvestmentBenefitsService } from './investment-benefits.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    InvestmentPrismaRepository,
    InvestmentMockRepository,
    createProviderBackedBinding({
      token: 'INVESTMENT_DATA_SOURCE',
      databaseToken: InvestmentPrismaRepository,
      mockToken: InvestmentMockRepository,
      logLabel: '📈 Investments',
    }),
    InvestmentRepository,
    BenefitPrismaRepository,
    BenefitMockRepository,
    createProviderBackedBinding({
      token: 'INVESTMENT_BENEFIT_DATA_SOURCE',
      databaseToken: BenefitPrismaRepository,
      mockToken: BenefitMockRepository,
      logLabel: '📈 Investment benefits',
    }),
    BenefitRepository,
    InvestmentBenefitsService,
  ],
  controllers: [InvestmentBenefitsController],
  exports: [InvestmentBenefitsService],
})
export class InvestmentBenefitsModule {}