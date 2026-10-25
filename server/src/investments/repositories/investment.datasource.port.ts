import type { InvestmentRecord } from '../investment.types';
import type { Prisma } from '@prisma/client';
import type { InvestmentListQuery } from '../investment.types';
import type { CreateInvestmentDto } from '../dto/create-investment.dto';
import type { UpdateInvestmentDto } from '../dto/update-investment.dto';
import type { ListResult } from '../../common/listing/listing.types';

export interface IInvestmentDataSourcePort {
  create(data: CreateInvestmentDto, userId: number, transaction?: Prisma.TransactionClient): Promise<InvestmentRecord>;
  findAll(userId: number): Promise<InvestmentRecord[]>;
  findPage(userId: number, query: InvestmentListQuery): Promise<ListResult<InvestmentRecord>>;
  findAllForPortfolio(userId: number): Promise<InvestmentRecord[]>;
  findOne(id: number, userId: number): Promise<InvestmentRecord | null>;
  findById(id: number): Promise<InvestmentRecord | null>;
  update(id: number, data: UpdateInvestmentDto, userId: number, transaction?: Prisma.TransactionClient): Promise<InvestmentRecord | null>;
  delete(id: number, userId: number): Promise<void>;
}
