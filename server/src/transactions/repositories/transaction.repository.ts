import { Inject, Injectable } from '@nestjs/common';
import type { TransactionRecord } from '../transaction.types';
import type { CreateTransactionDto } from '../dto/create-transaction.dto';
import type { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { ITransactionDataSourcePort } from './transaction.datasource.port';

@Injectable()
export class TransactionRepository {
  constructor(
    @Inject('TRANSACTION_DATA_SOURCE')
    private readonly dataSource: ITransactionDataSourcePort,
  ) {}

  async findAll(userId: number): Promise<TransactionRecord[]> {
    return this.dataSource.findAll(userId);
  }

  async findOne(id: number, userId: number): Promise<TransactionRecord | null> {
    return this.dataSource.findOne(id, userId);
  }

  async create(data: CreateTransactionDto, userId: number): Promise<TransactionRecord> {
    return this.dataSource.create(data, userId);
  }

  async update(id: number, data: UpdateTransactionDto, userId: number): Promise<TransactionRecord | null> {
    return this.dataSource.update(id, data, userId);
  }

  async delete(id: number, userId: number): Promise<void> {
    return this.dataSource.delete(id, userId);
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TransactionRecord[]> {
    return this.dataSource.findByDateRange(userId, startDate, endDate);
  }

  async findByType(userId: number, type: string): Promise<TransactionRecord[]> {
    return this.dataSource.findByType(userId, type);
  }
}
