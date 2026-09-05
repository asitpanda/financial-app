import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentBenefitStatus } from '@prisma/client';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { CreateInvestmentBenefitDto } from './dto/create-investment-benefit.dto';
import { UpdateInvestmentBenefitDto } from './dto/update-investment-benefit.dto';
import { QuickRealizeInvestmentBenefitDto, RealizeInvestmentBenefitDto } from './dto/realize-investment-benefit.dto';
import { BenefitRepository } from './repositories/benefit.repository';

@Injectable()
export class InvestmentBenefitsService {
  constructor(
    private readonly repository: BenefitRepository,
    private readonly investmentRepository: InvestmentRepository,
  ) {}

  findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findAllByInvestment(investmentId: string, userId: number) {
    await this.assertOwnedInvestment(investmentId, userId);
    return this.repository.findAllByInvestmentWithDetails(investmentId);
  }

  async create(investmentId: string, data: CreateInvestmentBenefitDto, userId: number) {
    await this.assertOwnedInvestment(investmentId, userId);
    this.assertValidAmount(data.amount);
    return this.repository.create(investmentId, data);
  }

  async findOne(id: string, investmentId: string, userId: number) {
    const benefit = await this.repository.findOne(id);
    if (!benefit || benefit.investmentId !== Number(investmentId)) {
      throw new NotFoundException(`Investment benefit ${id} not found`);
    }
    await this.assertOwnedInvestment(String(benefit.investmentId), userId);
    return benefit;
  }

  async findOneWithDetails(id: string, investmentId: string, userId: number) {
    const benefit = await this.repository.findOneWithDetails(id);
    if (!benefit || benefit.investmentId !== Number(investmentId)) {
      throw new NotFoundException(`Investment benefit ${id} not found`);
    }
    await this.assertOwnedInvestment(String(benefit.investmentId), userId);
    return benefit;
  }

  async update(id: string, investmentId: string, data: UpdateInvestmentBenefitDto, userId: number) {
    const existing = await this.findOne(id, investmentId, userId);
    if (data.amount !== undefined) this.assertValidAmount(data.amount);
    this.assertStatusTransition(existing.status, data.status);
    return this.repository.update(id, data);
  }

  async remove(id: string, investmentId: string, userId: number) {
    await this.findOne(id, investmentId, userId);
    return this.repository.delete(id);
  }

  async realize(id: string, investmentId: string, data: RealizeInvestmentBenefitDto, userId: number) {
    const benefit = await this.findOne(id, investmentId, userId);
    this.assertRealizable(benefit.status, data.components, benefit.amount);
    return this.repository.realize(id, investmentId, userId, data);
  }

  async quickRealize(investmentId: string, data: QuickRealizeInvestmentBenefitDto, userId: number) {
    await this.assertOwnedInvestment(investmentId, userId);
    this.assertValidAmount(data.amount);
    return this.repository.quickRealize(investmentId, userId, data);
  }

  private async assertOwnedInvestment(investmentId: string, userId: number) {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) throw new NotFoundException(`Investment ${investmentId} not found`);
    return investment;
  }

  private assertValidAmount(amount: number) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Benefit amount must be a non-negative number.');
    }
  }

  private assertStatusTransition(current: InvestmentBenefitStatus, next?: InvestmentBenefitStatus) {
    if (next === undefined || next === current) return;
    if (current !== InvestmentBenefitStatus.EXPECTED) {
      throw new BadRequestException('Only expected benefits can change status.');
    }
    if (next !== InvestmentBenefitStatus.RECEIVED && next !== InvestmentBenefitStatus.CANCELLED) {
      throw new BadRequestException('Expected benefits can only be marked received or cancelled.');
    }
  }

  private assertRealizable(
    status: InvestmentBenefitStatus,
    components: RealizeInvestmentBenefitDto['components'],
    benefitAmount: number,
  ) {
    if (status !== InvestmentBenefitStatus.EXPECTED) {
      throw new BadRequestException('Only expected benefits can be realized.');
    }
    if (!components?.length) {
      throw new BadRequestException('At least one realization component is required.');
    }
    const total = components.reduce((sum, component) => sum + component.amount, 0);
    if (!Number.isFinite(total) || Math.abs(total - benefitAmount) > 0.000001) {
      throw new BadRequestException('Realization component amounts must equal the benefit amount.');
    }
  }
}