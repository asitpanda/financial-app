import { Module } from '@nestjs/common';
import { MockInvestmentEventRepository } from './repositories/mock-investment-event.repository';
import { InvestmentEventsService } from './investment-events.service';
import { InvestmentEventsController } from './investment-events.controller';

@Module({
  providers: [MockInvestmentEventRepository, InvestmentEventsService],
  controllers: [InvestmentEventsController],
  exports: [MockInvestmentEventRepository, InvestmentEventsService],
})
export class InvestmentEventsModule {}
