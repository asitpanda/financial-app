import { Inject, Injectable } from '@nestjs/common';
import { IInvestmentDataSourcePort } from './investment.datasource.port';

@Injectable()
export class InvestmentRepository {
  constructor(
    @Inject('INVESTMENT_DATA_SOURCE')
    private readonly dataSource: IInvestmentDataSourcePort,
  ) {}

  async create(data: any, userId: number): Promise<any> {
    return this.dataSource.create(data, userId);
  }

  async findAll(userId: number): Promise<any[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
