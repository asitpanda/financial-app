import type { FinancialAccountRecord } from '../financial-account.types';
import type { CreateFinancialAccountDto } from '../dto/create-financial-account.dto';
import type { UpdateFinancialAccountDto } from '../dto/update-financial-account.dto';

export interface IFinancialAccountDataSourcePort {
  create(data: CreateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord>;
  findAll(userId: string): Promise<FinancialAccountRecord[]>;
  findOne(id: string, userId: string): Promise<FinancialAccountRecord | null>;
  update(id: string, data: UpdateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord | null>;
  delete(id: string, userId: string): Promise<void>;
}
