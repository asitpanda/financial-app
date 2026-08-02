import { Injectable } from '@nestjs/common';
import { EventRepository } from './repositories/event.repository';
import { CreateInvestmentEventDto } from './dto/create-investment-event.dto';
import { UpdateInvestmentEventDto } from './dto/update-investment-event.dto';

@Injectable()
export class InvestmentEventsService {
  constructor(private readonly repository: EventRepository) {}

  async create(createInvestmentEventDto: CreateInvestmentEventDto) {
    return this.repository.create(createInvestmentEventDto);
  }

  async findAllByInvestment(investmentId: string) {
    return this.repository.findAllByInvestment(investmentId);
  }

  async findOne(id: string) {
    return this.repository.findOne(id);
  }

  async update(id: string, updateInvestmentEventDto: UpdateInvestmentEventDto) {
    return this.repository.update(id, updateInvestmentEventDto);
  }

  async remove(id: string) {
    return this.repository.delete(id);
  }
}
