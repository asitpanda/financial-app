import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentEventStatus, InvestmentEventType } from '@prisma/client';
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

    this.assertIncomeCreditIsInvestmentOnly(createInvestmentEventDto);

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
    const existingEvent = await this.findOne(id, userId);
    if (!existingEvent) return null;

    if (userId !== undefined) {
      if (updateInvestmentEventDto.investmentId !== undefined) {
        await this.assertOwnedInvestment(updateInvestmentEventDto.investmentId, userId);
      }
    }

    this.assertIncomeCreditIsInvestmentOnly({
      ...existingEvent,
      ...updateInvestmentEventDto,
      linkedTransactionId:
        updateInvestmentEventDto.linkedTransactionId ?? existingEvent.linkedTransactionId ?? undefined,
    });

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

  private assertIncomeCreditIsInvestmentOnly(event: {
    eventType?: InvestmentEventType;
    linkedTransactionId?: string | number | null;
    status?: string | null;
  }) {
    if (event.eventType !== InvestmentEventType.INCOME_CREDIT) return;

    if (event.linkedTransactionId != null && String(event.linkedTransactionId).trim() !== '') {
      throw new BadRequestException('Income credit cannot be linked to a transaction.');
    }

    if (event.status !== InvestmentEventStatus.CONFIRMED) {
      throw new BadRequestException('Income credit must be recorded as a confirmed event.');
    }
  }
}
