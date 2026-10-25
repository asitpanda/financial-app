import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateValuationSnapshotDto } from './dto/create-valuation-snapshot.dto';
import { UpdateValuationSnapshotDto } from './dto/update-valuation-snapshot.dto';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { ValuationSnapshotRepository } from './repositories/valuation-snapshot.repository';

@Injectable()
export class ValuationSnapshotsService {
  constructor(
    private readonly repository: ValuationSnapshotRepository,
    private readonly investmentRepository: InvestmentRepository,
  ) {}

  private async resolveInvestmentUserId(investmentId: string | number) {
    const investment = await this.investmentRepository.findById(Number(investmentId));
    if (!investment) {
      throw new NotFoundException(`Investment ${investmentId} not found`);
    }

    return Number(investment.userId);
  }

  private async assertOwnedInvestment(investmentId: string | number, userId: number) {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) {
      throw new NotFoundException(`Investment ${investmentId} not found`);
    }

    return investment;
  }

  private async resolveOwnedSnapshot(id: string, userId: number) {
    const snapshot = await this.repository.findOne(id);
    if (!snapshot) {
      return null;
    }

    await this.assertOwnedInvestment(snapshot.investmentId, userId);
    return snapshot;
  }

  async create(createValuationSnapshotDto: CreateValuationSnapshotDto, userId?: number) {
    const resolvedUserId = userId !== undefined
      ? Number((await this.assertOpenInvestment(createValuationSnapshotDto.investmentId, userId)).userId)
      : await this.resolveInvestmentUserId(createValuationSnapshotDto.investmentId);
    const snapshot = await this.repository.create({
      ...createValuationSnapshotDto,
      userId: String(resolvedUserId),
    });
    return snapshot;
  }

  async findAll(userId: number) {
    return this.repository.findAll(userId);
  }

  async findAllByInvestment(investmentId: string, userId?: number) {
    if (userId !== undefined) {
      await this.assertOwnedInvestment(investmentId, userId);
    }

    return this.repository.findAllByInvestment(investmentId);
  }

  async findOne(id: string, userId?: number) {
    if (userId !== undefined) {
      return this.resolveOwnedSnapshot(id, userId);
    }

    return this.repository.findOne(id);
  }

  async update(id: string, updateValuationSnapshotDto: UpdateValuationSnapshotDto, userId?: number) {
    const existingSnapshot = userId !== undefined
      ? await this.resolveOwnedSnapshot(id, userId)
      : await this.repository.findOne(id);

    if (!existingSnapshot) {
      return null;
    }

    if (userId !== undefined) {
      await this.assertOpenInvestment(existingSnapshot.investmentId, userId);
    }

    if (userId !== undefined && updateValuationSnapshotDto.investmentId !== undefined) {
      await this.assertOpenInvestment(updateValuationSnapshotDto.investmentId, userId);
    }

    const snapshot = await this.repository.update(id, updateValuationSnapshotDto);
    return snapshot;
  }

  async remove(id: string, userId?: number) {
    const existingSnapshot = userId !== undefined
      ? await this.resolveOwnedSnapshot(id, userId)
      : await this.repository.findOne(id);

    if (!existingSnapshot) {
      return;
    }

    if (userId !== undefined) {
      await this.assertOpenInvestment(existingSnapshot.investmentId, userId);
    }

    await this.repository.delete(id);
  }

  private async assertOpenInvestment(investmentId: string | number, userId: number) {
    const investment = await this.assertOwnedInvestment(investmentId, userId);
    if (String(investment.status || '').trim().toLowerCase() === 'closed') {
      throw new BadRequestException('Closed investments cannot be modified.');
    }
    return investment;
  }
}
