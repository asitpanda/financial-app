import type { TransactionRecord } from '../transaction.types';
import type { CreateTransactionDto } from '../dto/create-transaction.dto';
import type { UpdateTransactionDto } from '../dto/update-transaction.dto';

export interface ITransactionDataSourcePort {
  findAll(userId: number): Promise<TransactionRecord[]>;
  findOne(id: number, userId: number): Promise<TransactionRecord | null>;
  create(data: CreateTransactionDto, userId: number): Promise<TransactionRecord>;
  update(id: number, data: UpdateTransactionDto, userId: number): Promise<TransactionRecord | null>;
  delete(id: number, userId: number): Promise<void>;
  findByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TransactionRecord[]>;
  findByType(userId: number, type: string): Promise<TransactionRecord[]>;
}
