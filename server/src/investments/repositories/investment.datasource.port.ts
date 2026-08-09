import type { InvestmentRecord } from '../investment.types';
import type { CreateInvestmentDto } from '../dto/create-investment.dto';
import type { UpdateInvestmentDto } from '../dto/update-investment.dto';

export interface IInvestmentDataSourcePort {
  create(data: CreateInvestmentDto, userId: number): Promise<InvestmentRecord>;
  findAll(userId: number): Promise<InvestmentRecord[]>;
  findOne(id: number, userId: number): Promise<InvestmentRecord | null>;
  findById(id: number): Promise<InvestmentRecord | null>;
  update(id: number, data: UpdateInvestmentDto, userId: number): Promise<InvestmentRecord | null>;
  delete(id: number, userId: number): Promise<void>;
}
