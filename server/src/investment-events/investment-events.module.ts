import { Module } from '@nestjs/common';
import { EventMockRepository } from './repositories/event.mock.repository';
import { EventPrismaRepository } from './repositories/event.prisma.repository';
import { EventRepository } from './repositories/event.repository';
import { InvestmentEventsService } from './investment-events.service';
import { InvestmentEventsController } from './investment-events.controller';
import { createProviderBackedBinding } from '../database/db-provider';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { InvestmentMockRepository } from '../investments/repositories/investment.mock.repository';
import { InvestmentPrismaRepository } from '../investments/repositories/investment.prisma.repository';
import { InvestmentRepository } from '../investments/repositories/investment.repository';

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
    EventPrismaRepository,
    EventMockRepository,
    createProviderBackedBinding({
      token: 'INVESTMENT_EVENT_DATA_SOURCE',
      databaseToken: EventPrismaRepository,
      mockToken: EventMockRepository,
      logLabel: '📈 Investment events',
    }),
    EventRepository,
    InvestmentEventsService,
  ],
  controllers: [InvestmentEventsController],
  exports: [InvestmentEventsService],
})
export class InvestmentEventsModule {}
