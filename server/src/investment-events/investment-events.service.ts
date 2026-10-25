import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentEventStatus, InvestmentEventType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
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

  async create(createInvestmentEventDto: CreateInvestmentEventDto, userId?: number, transaction?: Prisma.TransactionClient) {
    if (userId !== undefined && !transaction && (createInvestmentEventDto.linkedTransactionId != null || createInvestmentEventDto.linkedBenefitId != null)) {
      throw new BadRequestException('Linked investment activity must be recorded through its financial command.');
    }
    if (userId !== undefined) {
      await this.assertOpenInvestment(createInvestmentEventDto.investmentId, userId);
    }

    this.assertIncomeCreditIsInvestmentOnly(createInvestmentEventDto);

    return this.repository.create(createInvestmentEventDto, transaction);
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

    if (existingEvent.linkedTransactionId != null || updateInvestmentEventDto.linkedTransactionId != null || existingEvent.linkedBenefitId != null || updateInvestmentEventDto.linkedBenefitId != null) {
      throw new BadRequestException(
        'Investment events linked to transactions cannot be edited independently.',
      );
    }

    if (userId !== undefined) {
      await this.assertOpenInvestment(existingEvent.investmentId, userId);
      if (updateInvestmentEventDto.investmentId !== undefined) {
        await this.assertOpenInvestment(updateInvestmentEventDto.investmentId, userId);
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
    const existingEvent = await this.findOne(id, userId);
    if (!existingEvent) return;

    if (existingEvent.linkedTransactionId != null || existingEvent.linkedBenefitId != null) {
      throw new BadRequestException(
        'Investment events linked to transactions cannot be deleted independently.',
      );
    }

    if (userId !== undefined) {
      await this.assertOpenInvestment(existingEvent.investmentId, userId);
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

  private async assertOpenInvestment(investmentId: string | number, userId: number) {
    const investment = await this.assertOwnedInvestment(String(investmentId), userId);
    if (String(investment.status || '').trim().toLowerCase() === 'closed') {
      throw new BadRequestException('Closed investments cannot be modified.');
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
