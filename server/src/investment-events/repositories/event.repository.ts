import { Inject, Injectable } from '@nestjs/common';
import type { InvestmentEventRecord } from '../investment-event.types';
import type { CreateInvestmentEventDto } from '../dto/create-investment-event.dto';
import type { UpdateInvestmentEventDto } from '../dto/update-investment-event.dto';
import { IEventDataSourcePort } from './event.datasource.port';

@Injectable()
export class EventRepository {
  constructor(
    @Inject('INVESTMENT_EVENT_DATA_SOURCE')
    private readonly dataSource: IEventDataSourcePort,
  ) {}

  async create(data: CreateInvestmentEventDto): Promise<InvestmentEventRecord> {
    return this.dataSource.create(data);
  }

  async findAll(userId: number): Promise<InvestmentEventRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findAllByInvestment(investmentId: string): Promise<InvestmentEventRecord[]> {
    return this.dataSource.findAllByInvestment(investmentId);
  }

  async findOne(id: string): Promise<InvestmentEventRecord | null> {
    return this.dataSource.findOne(id);
  }

  async update(id: string, data: UpdateInvestmentEventDto): Promise<InvestmentEventRecord | null> {
    return this.dataSource.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.dataSource.delete(id);
  }
}
