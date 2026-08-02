import { Inject, Injectable } from '@nestjs/common';
import { IEventDataSourcePort } from './event.datasource.port';

@Injectable()
export class EventRepository {
  constructor(
    @Inject('INVESTMENT_EVENT_DATA_SOURCE')
    private readonly dataSource: IEventDataSourcePort,
  ) {}

  async create(data: any): Promise<any> {
    return this.dataSource.create(data);
  }

  async findAllByInvestment(investmentId: string): Promise<any[]> {
    return this.dataSource.findAllByInvestment(investmentId);
  }

  async findOne(id: string): Promise<any> {
    return this.dataSource.findOne(id);
  }

  async update(id: string, data: any): Promise<any> {
    return this.dataSource.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.dataSource.delete(id);
  }
}
