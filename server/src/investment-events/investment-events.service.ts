import { Injectable, NotFoundException } from '@nestjs/common';
import { EventRepository } from './repositories/event.repository';
import { CreateInvestmentEventDto } from './dto/create-investment-event.dto';
import { UpdateInvestmentEventDto } from './dto/update-investment-event.dto';
import { InvestmentRepository } from '../investments/repositories/investment.repository';

@Injectable()
export class InvestmentEventsService {
  constructor(
    private readonly repository: EventRepository,
    private readonly investmentRepository: InvestmentRepository,
  ) {}

  async create(createInvestmentEventDto: CreateInvestmentEventDto, userId?: number) {
    if (userId !== undefined) {
      await this.assertOwnedInvestment(createInvestmentEventDto.investmentId, userId);
    }

    return this.repository.create(createInvestmentEventDto);
  }

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findAllByInvestment(investmentId: string, userId?: number) {
    if (userId !== undefined) {
      await this.assertOwnedInvestment(investmentId, userId);
    }

    return this.repository.findAllByInvestment(investmentId);
  }

  async findOne(id: string, userId?: number) {
    const event = await this.repository.findOne(id);
    if (!event) return null;

    if (userId !== undefined) {
      await this.assertOwnedInvestment(String(event.investmentId), userId);
    }

    return event;
  }

  async update(id: string, updateInvestmentEventDto: UpdateInvestmentEventDto, userId?: number) {
    if (userId !== undefined) {
      const existingEvent = await this.findOne(id, userId);
      if (!existingEvent) return null;

      if (updateInvestmentEventDto.investmentId !== undefined) {
        await this.assertOwnedInvestment(updateInvestmentEventDto.investmentId, userId);
      }
    }

    return this.repository.update(id, updateInvestmentEventDto);
  }

  async remove(id: string, userId?: number) {
    if (userId !== undefined) {
      const existingEvent = await this.findOne(id, userId);
      if (!existingEvent) return;
    }

    return this.repository.delete(id);
  }

  private async assertOwnedInvestment(investmentId: string, userId: number) {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) {
      throw new NotFoundException(`Investment ${investmentId} not found`);
    }

    return investment;
  }
}
