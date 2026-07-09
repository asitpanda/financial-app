import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITransactionRepository } from './repositories/transaction.repository.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { mockBanksData } from '../mockdata';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('TRANSACTION_REPOSITORY')
    private readonly repository: ITransactionRepository,
    private readonly configService: ConfigService,
  ) {}

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(id, userId);
  }

  async create(createTransactionDto: CreateTransactionDto, userId: number) {
    return this.repository.create(createTransactionDto, userId);
  }

  async update(
    id: number,
    updateTransactionDto: UpdateTransactionDto,
    userId: number,
  ) {
    return this.repository.update(id, updateTransactionDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date) {
    return this.repository.findByDateRange(userId, startDate, endDate);
  }

  async findByType(userId: number, type: string) {
    return this.repository.findByType(userId, type);
  }

  async getSources() {
    return mockBanksData;
  }
}
