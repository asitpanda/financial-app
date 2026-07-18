import { Inject, Injectable } from '@nestjs/common';
import { CreateFinancialAccountDto } from './dto/create-financial-account.dto';
import { UpdateFinancialAccountDto } from './dto/update-financial-account.dto';
import { IFinancialAccountRepository } from './repositories/financial-account.repository.interface';

@Injectable()
export class FinancialAccountsService {
  constructor(
    @Inject('FINANCIAL_ACCOUNT_REPOSITORY')
    private readonly repository: IFinancialAccountRepository,
  ) {}

  async create(createDto: CreateFinancialAccountDto, userId: number) {
    return this.repository.create(createDto, String(userId));
  }

  async findAll(userId: number) {
    return this.repository.findAll(String(userId));
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(String(id), String(userId));
  }

  async update(id: number, updateDto: UpdateFinancialAccountDto, userId: number) {
    return this.repository.update(String(id), updateDto, String(userId));
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(String(id), String(userId));
  }
}
