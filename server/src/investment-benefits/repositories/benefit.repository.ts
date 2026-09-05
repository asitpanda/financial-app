import { Inject, Injectable } from '@nestjs/common';
import type { CreateInvestmentBenefitDto } from '../dto/create-investment-benefit.dto';
import type { UpdateInvestmentBenefitDto } from '../dto/update-investment-benefit.dto';
import type { InvestmentBenefitRecord, InvestmentBenefitDetailRecord } from '../investment-benefit.types';
import type { IBenefitDataSourcePort } from './benefit.datasource.port';
import type { QuickRealizeInvestmentBenefitDto, RealizeInvestmentBenefitDto } from '../dto/realize-investment-benefit.dto';

@Injectable()
export class BenefitRepository {
  constructor(@Inject('INVESTMENT_BENEFIT_DATA_SOURCE') private readonly dataSource: IBenefitDataSourcePort) {}

  create(investmentId: string, data: CreateInvestmentBenefitDto) {
    return this.dataSource.create(investmentId, data);
  }

  findAll(userId: number): Promise<InvestmentBenefitRecord[]> {
    return this.dataSource.findAll(userId);
  }

  findAllByInvestment(investmentId: string): Promise<InvestmentBenefitRecord[]> {
    return this.dataSource.findAllByInvestment(investmentId);
  }

  findAllByInvestmentWithDetails(investmentId: string): Promise<InvestmentBenefitDetailRecord[]> {
    return this.dataSource.findAllByInvestmentWithDetails(investmentId);
  }

  findOne(id: string): Promise<InvestmentBenefitRecord | null> {
    return this.dataSource.findOne(id);
  }

  findOneWithDetails(id: string): Promise<InvestmentBenefitDetailRecord | null> {
    return this.dataSource.findOneWithDetails(id);
  }

  update(id: string, data: UpdateInvestmentBenefitDto) {
    return this.dataSource.update(id, data);
  }

  delete(id: string) {
    return this.dataSource.delete(id);
  }

  realize(id: string, investmentId: string, userId: number, data: RealizeInvestmentBenefitDto) {
    return this.dataSource.realize(id, investmentId, userId, data);
  }

  quickRealize(investmentId: string, userId: number, data: QuickRealizeInvestmentBenefitDto) {
    return this.dataSource.quickRealize(investmentId, userId, data);
  }
}