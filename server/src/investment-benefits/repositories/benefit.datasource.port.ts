import type { CreateInvestmentBenefitDto } from '../dto/create-investment-benefit.dto';
import type { UpdateInvestmentBenefitDto } from '../dto/update-investment-benefit.dto';
import type { InvestmentBenefitRecord, InvestmentBenefitDetailRecord } from '../investment-benefit.types';
import type { InvestmentEventRecord } from '../../investment-events/investment-event.types';
import type { QuickRealizeInvestmentBenefitDto, RealizeInvestmentBenefitDto } from '../dto/realize-investment-benefit.dto';

export interface IBenefitDataSourcePort {
  create(investmentId: string, data: CreateInvestmentBenefitDto): Promise<InvestmentBenefitRecord>;
  findAll(userId: number): Promise<InvestmentBenefitRecord[]>;
  findAllByInvestment(investmentId: string): Promise<InvestmentBenefitRecord[]>;
  findAllByInvestmentWithDetails(investmentId: string): Promise<InvestmentBenefitDetailRecord[]>;
  findOne(id: string): Promise<InvestmentBenefitRecord | null>;
  findOneWithDetails(id: string): Promise<InvestmentBenefitDetailRecord | null>;
  update(id: string, data: UpdateInvestmentBenefitDto): Promise<InvestmentBenefitRecord | null>;
  delete(id: string): Promise<void>;
  realize(id: string, investmentId: string, userId: number, data: RealizeInvestmentBenefitDto): Promise<{ benefit: InvestmentBenefitRecord; events: InvestmentEventRecord[] }>;
  quickRealize(investmentId: string, userId: number, data: QuickRealizeInvestmentBenefitDto): Promise<{ benefit: InvestmentBenefitRecord; events: InvestmentEventRecord[] }>;
}