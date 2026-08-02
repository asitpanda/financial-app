import { Module } from '@nestjs/common';
import { EventMockRepository } from './repositories/event.mock.repository';
import { EventPrismaRepository } from './repositories/event.prisma.repository';
import { EventRepository } from './repositories/event.repository';
import { InvestmentEventsService } from './investment-events.service';
import { InvestmentEventsController } from './investment-events.controller';
import { createProviderBackedBinding } from '../database/db-provider';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
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
