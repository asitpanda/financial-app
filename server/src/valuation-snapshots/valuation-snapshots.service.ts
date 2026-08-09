import { Injectable, NotFoundException } from '@nestjs/common';
import type { ValuationSnapshotRecord } from './valuation-snapshot.types';
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

  private getLatestSnapshot(snapshots: ValuationSnapshotRecord[] = []): ValuationSnapshotRecord | null {
    return snapshots
      .filter((snapshot) => snapshot?.snapshotDate)
      .sort(
        (left, right) =>
          new Date(right.snapshotDate).getTime() -
          new Date(left.snapshotDate).getTime(),
      )[0] ?? null;
  }

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

  private async syncInvestmentCurrentValue(investmentId: string | number, userId: number) {
    const investment = await this.investmentRepository.findOne(Number(investmentId), userId);
    if (!investment) return;

    const snapshots = await this.repository.findAllByInvestment(String(investmentId));
    const latestSnapshot = this.getLatestSnapshot(snapshots);

    if (!latestSnapshot) {
      await this.investmentRepository.update(
        Number(investmentId),
        {
          currentValue: investment.totalInvested,
          lastValuationAt: null,
          currentValueSource: 'manual',
        },
        userId,
      );
      return;
    }

    await this.investmentRepository.update(
      Number(investmentId),
      {
        currentValue: Number(latestSnapshot.marketValue ?? investment.currentValue ?? 0),
        lastValuationAt: new Date(latestSnapshot.snapshotDate).toISOString(),
        currentValueSource: 'valuation_snapshot',
      },
      userId,
    );
  }

  async create(createValuationSnapshotDto: CreateValuationSnapshotDto, userId?: number) {
    const resolvedUserId = userId !== undefined
      ? Number((await this.assertOwnedInvestment(createValuationSnapshotDto.investmentId, userId)).userId)
      : await this.resolveInvestmentUserId(createValuationSnapshotDto.investmentId);
    const snapshot = await this.repository.create({
      ...createValuationSnapshotDto,
      userId: String(resolvedUserId),
    });
    await this.syncInvestmentCurrentValue(
      snapshot.investmentId,
      resolvedUserId,
    );
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

    if (userId !== undefined && updateValuationSnapshotDto.investmentId !== undefined) {
      await this.assertOwnedInvestment(updateValuationSnapshotDto.investmentId, userId);
    }

    const snapshot = await this.repository.update(id, updateValuationSnapshotDto);
    const investmentIds = new Set<string | number>();

    if (existingSnapshot?.investmentId != null) {
      investmentIds.add(existingSnapshot.investmentId);
    }
    if (snapshot?.investmentId != null) {
      investmentIds.add(snapshot.investmentId);
    }

    await Promise.all(
      Array.from(investmentIds).map(async (investmentId) => {
        const resolvedUserId = userId !== undefined
          ? Number((await this.assertOwnedInvestment(investmentId, userId)).userId)
          : await this.resolveInvestmentUserId(investmentId);
        return this.syncInvestmentCurrentValue(investmentId, resolvedUserId);
      }),
    );

    return snapshot;
  }

  async remove(id: string, userId?: number) {
    const existingSnapshot = userId !== undefined
      ? await this.resolveOwnedSnapshot(id, userId)
      : await this.repository.findOne(id);

    if (!existingSnapshot) {
      return;
    }

    await this.repository.delete(id);

    if (existingSnapshot?.investmentId != null) {
      const resolvedUserId = userId !== undefined
        ? Number((await this.assertOwnedInvestment(existingSnapshot.investmentId, userId)).userId)
        : await this.resolveInvestmentUserId(existingSnapshot.investmentId);
      await this.syncInvestmentCurrentValue(
        existingSnapshot.investmentId,
        resolvedUserId,
      );
    }
  }
}
