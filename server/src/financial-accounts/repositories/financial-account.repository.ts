import { Inject, Injectable } from '@nestjs/common';
import { IFinancialAccountDataSourcePort } from './financial-account.datasource.port';

@Injectable()
export class FinancialAccountRepository {
  constructor(
    @Inject('FINANCIAL_ACCOUNT_DATA_SOURCE')
    private readonly dataSource: IFinancialAccountDataSourcePort,
  ) {}

  async create(data: any, userId: string): Promise<any> {
    return this.dataSource.create(data, userId);
  }

  async findAll(userId: string): Promise<any[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: string, userId: string): Promise<any> {
    return this.dataSource.findOne(id, userId);
  }

  async update(id: string, data: any, userId: string): Promise<any> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    return this.dataSource.delete(id, userId);
  }
}
