import { Inject, Injectable } from '@nestjs/common';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { IInvestmentRepository } from './repositories/investment.repository.interface';

@Injectable()
export class InvestmentsService {
  constructor(
    @Inject('INVESTMENT_REPOSITORY')
    private readonly repository: IInvestmentRepository,
  ) {}

  async create(createInvestmentDto: CreateInvestmentDto, userId: number) {
    return this.repository.create(createInvestmentDto, userId);
  }

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findOne(id: number, userId: number) {
    return this.repository.findOne(id, userId);
  }

  async update(id: number, updateInvestmentDto: UpdateInvestmentDto, userId: number) {
    return this.repository.update(id, updateInvestmentDto, userId);
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(id, userId);
  }
}