import { Inject, Injectable } from '@nestjs/common';
import type { FinancialAccountRecord } from '../financial-account.types';
import type { CreateFinancialAccountDto } from '../dto/create-financial-account.dto';
import type { UpdateFinancialAccountDto } from '../dto/update-financial-account.dto';
import { IFinancialAccountDataSourcePort } from './financial-account.datasource.port';

@Injectable()
export class FinancialAccountRepository {
  constructor(
    @Inject('FINANCIAL_ACCOUNT_DATA_SOURCE')
    private readonly dataSource: IFinancialAccountDataSourcePort,
  ) {}

  async create(data: CreateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord> {
    return this.dataSource.create(data, userId);
  }

  async findAll(userId: string): Promise<FinancialAccountRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: string, userId: string): Promise<FinancialAccountRecord | null> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: string, data: UpdateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord | null> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    return this.dataSource.delete(id, userId);
  }

  async sumTransactionFlows(accountIds: number[]) {
    return this.dataSource.sumTransactionFlows(accountIds);
  }
}
