import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentBenefitStatus } from '@prisma/client';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { FinancialAccountsService } from '../financial-accounts/financial-accounts.service';
import { CreateInvestmentBenefitDto } from './dto/create-investment-benefit.dto';
import { UpdateInvestmentBenefitDto } from './dto/update-investment-benefit.dto';
import { QuickRealizeInvestmentBenefitDto, RealizeInvestmentBenefitDto } from './dto/realize-investment-benefit.dto';
import { BenefitRepository } from './repositories/benefit.repository';

@Injectable()
export class InvestmentBenefitsService {
  constructor(
    private readonly repository: BenefitRepository,
    private readonly investmentRepository: InvestmentRepository,
    private readonly financialAccountsService: FinancialAccountsService,
  ) {}

  findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findAllByInvestment(investmentId: string, userId: number) {
    await this.assertOwnedInvestment(investmentId, userId);
    return this.repository.findAllByInvestmentWithDetails(investmentId);
  }

  async create(investmentId: string, data: CreateInvestmentBenefitDto, userId: number) {
    await this.assertOpenInvestment(investmentId, userId);
    this.assertValidAmount(data.amount);
    await this.assertDestinationAccount(data.destinationAccountId, userId);
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
    await this.assertOpenInvestment(investmentId, userId);
    if (data.amount !== undefined) this.assertValidAmount(data.amount);
    this.assertStatusTransition(existing.status, data.status);
    await this.assertDestinationAccount(data.destinationAccountId, userId);
    return this.repository.update(id, data);
  }

  async remove(id: string, investmentId: string, userId: number) {
    await this.findOne(id, investmentId, userId);
    await this.assertOpenInvestment(investmentId, userId);
    return this.repository.delete(id);
  }

  async realize(id: string, investmentId: string, data: RealizeInvestmentBenefitDto, userId: number) {
    const benefit = await this.findOne(id, investmentId, userId);
    const investment = await this.assertOpenInvestment(investmentId, userId);
    if (data.benefitAmount !== undefined) this.assertValidAmount(data.benefitAmount);
    this.assertRealizable(
      benefit.status,
      data.components,
      data.benefitAmount ?? benefit.amount,
    );
    await this.assertRealizationDestinationAccounts(data, userId, investment.currency);
    await this.assertDestinationAccount(investment.accountId, userId, investment.currency);
    return this.repository.realize(id, investmentId, userId, data);
  }

  async quickRealize(investmentId: string, data: QuickRealizeInvestmentBenefitDto, userId: number) {
    const investment = await this.assertOpenInvestment(investmentId, userId);
    this.assertValidAmount(data.amount);
    await this.assertRealizationDestinationAccounts(data, userId, investment.currency);
    await this.assertDestinationAccount(investment.accountId, userId, investment.currency);
    return this.repository.quickRealize(investmentId, userId, data);
  }

  private async assertOwnedInvestment(investmentId: string, userId: number) {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) throw new NotFoundException(`Investment ${investmentId} not found`);
    return investment;
  }

  private async assertOpenInvestment(investmentId: string, userId: number) {
    const investment = await this.assertOwnedInvestment(investmentId, userId);
    if (String(investment.status || '').trim().toLowerCase() === 'closed') {
      throw new BadRequestException('Closed investments cannot be modified.');
    }
    return investment;
  }

  private async assertDestinationAccount(destinationAccountId: number | null | undefined, userId: number, currency?: string) {
    if (destinationAccountId == null) return;
    const account = await this.financialAccountsService.findOne(destinationAccountId, userId);
    if (!account) throw new BadRequestException('Destination account was not found for the current user.');
    if (currency && account.currency.toUpperCase() !== currency.toUpperCase()) {
      throw new BadRequestException('Benefit cash accounts must use the investment currency.');
    }
  }

  private async assertRealizationDestinationAccounts(
    data: RealizeInvestmentBenefitDto | QuickRealizeInvestmentBenefitDto,
    userId: number,
    currency: string,
  ) {
    const destinationAccountIds = [
      ...('components' in data
        ? data.components.flatMap((component) => [component.transaction?.sourceAccountId, component.transaction?.destinationAccountId])
        : [data.transaction?.sourceAccountId, data.transaction?.destinationAccountId]),
      ...('destinationAccountId' in data ? [data.destinationAccountId] : []),
    ];

    for (const destinationAccountId of destinationAccountIds) {
      await this.assertDestinationAccount(destinationAccountId, userId, currency);
    }
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