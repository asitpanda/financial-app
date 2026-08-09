import type { InvestmentEventRecord } from '../investment-event.types';
import type { CreateInvestmentEventDto } from '../dto/create-investment-event.dto';
import type { UpdateInvestmentEventDto } from '../dto/update-investment-event.dto';

export interface IEventDataSourcePort {
  create(data: CreateInvestmentEventDto): Promise<InvestmentEventRecord>;
  findAll(userId: number): Promise<InvestmentEventRecord[]>;
  findAllByInvestment(investmentId: string): Promise<InvestmentEventRecord[]>;
  findOne(id: string): Promise<InvestmentEventRecord | null>;
  update(id: string, data: UpdateInvestmentEventDto): Promise<InvestmentEventRecord | null>;
  delete(id: string): Promise<void>;
}
