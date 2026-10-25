import { Inject, Injectable } from '@nestjs/common';
import type { InvestmentRecord } from '../investment.types';
import type { CreateInvestmentDto } from '../dto/create-investment.dto';
import type { UpdateInvestmentDto } from '../dto/update-investment.dto';
import { IInvestmentDataSourcePort } from './investment.datasource.port';
import type { InvestmentListQuery } from '../investment.types';

@Injectable()
export class InvestmentRepository {
  constructor(
    @Inject('INVESTMENT_DATA_SOURCE')
    private readonly dataSource: IInvestmentDataSourcePort,
  ) {}

  async create(data: CreateInvestmentDto, userId: number): Promise<InvestmentRecord> {
    return this.dataSource.create(data, userId);
  }

  async findAll(userId: number): Promise<InvestmentRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findPage(userId: number, query: InvestmentListQuery) {
    return this.dataSource.findPage(userId, query);
  }

  async findAllForPortfolio(userId: number): Promise<InvestmentRecord[]> {
    return this.dataSource.findAllForPortfolio(userId);
  }

  async findOne(id: number, userId: number): Promise<InvestmentRecord | null> {
    return this.dataSource.findOne(id, userId);
  }

  async findById(id: number): Promise<InvestmentRecord | null> {
    return this.dataSource.findById(id);
  }

  async update(id: number, data: UpdateInvestmentDto, userId: number): Promise<InvestmentRecord | null> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
