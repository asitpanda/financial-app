import { Inject, Injectable } from '@nestjs/common';
import { ITransactionDataSourcePort } from './transaction.datasource.port';

@Injectable()
export class TransactionRepository {
  constructor(
    @Inject('TRANSACTION_DATA_SOURCE')
    private readonly dataSource: ITransactionDataSourcePort,
  ) {}

  async findAll(userId: number): Promise<any[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<any> {
    return this.dataSource.findOne(id, userId);
  }

  async create(data: any, userId: number): Promise<any> {
    return this.dataSource.create(data, userId);
  }

  async update(id: number, data: any, userId: number): Promise<any> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    return this.dataSource.findByDateRange(userId, startDate, endDate);
  }

  async findByType(userId: number, type: string): Promise<any[]> {
    return this.dataSource.findByType(userId, type);
  }
}
