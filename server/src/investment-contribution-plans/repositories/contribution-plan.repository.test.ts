import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContributionPlanRepository } from './contribution-plan.repository';

function createRepository() {
  const dataSource = {
    create: vi.fn(),
    findAllByInvestment: vi.fn(),
    findAllByInvestmentIds: vi.fn(),
    findAllByUser: vi.fn(),
    findAllActiveByUser: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findActiveByInvestment: vi.fn(),
    createPlanWithHistoricalEvents: vi.fn(),
    skipCurrentContribution: vi.fn(),
    generateDueRecurringInvestmentEvents: vi.fn(),
  };

  return { dataSource };
}

describe('ContributionPlanRepository', () => {
  let repository: ContributionPlanRepository;
  let dataSource: ReturnType<typeof createRepository>['dataSource'];

  beforeEach(async () => {
    const { ContributionPlanRepository: Repository } = await import('./contribution-plan.repository');
    ({ dataSource } = createRepository());
    repository = new Repository(dataSource as never);
  });

  it('forwards each operation, its arguments, and transaction clients to the datasource', async () => {
    const createData = { investmentId: '5', amount: 200 };
    const investmentIds = [5, 6];
    const updateData = { amount: 250 };
    const transaction = {};
    const confirmationData = { investmentId: '5', userId: 42, selectedHistoricalItems: [] };
    const skipData = { investmentId: '5', planId: '7', userId: 42, dueDate: '2026-01-01', nextDueDate: null };
    const cutoff = new Date('2026-01-31T00:00:00.000Z');

    await repository.create(createData as never);
    await repository.findAllByInvestment('5');
    await repository.findAllByInvestmentIds(investmentIds);
    await repository.findAllByUser(42);
    await repository.findAllActiveByUser(42);
    await repository.findOne('7', transaction as never);
    await repository.update('7', updateData as never, transaction as never);
    await repository.delete('7');
    await repository.findActiveByInvestment('5');
    await repository.createPlanWithHistoricalEvents(confirmationData as never, transaction as never);
    await repository.skipCurrentContribution(skipData);
    await repository.generateDueRecurringInvestmentEvents({ cutoffDate: cutoff, limit: 20 });

    expect(dataSource.create).toHaveBeenCalledWith(createData);
    expect(dataSource.findAllByInvestment).toHaveBeenCalledWith('5');
    expect(dataSource.findAllByInvestmentIds).toHaveBeenCalledWith(investmentIds);
    expect(dataSource.findAllByUser).toHaveBeenCalledWith(42);
    expect(dataSource.findAllActiveByUser).toHaveBeenCalledWith(42);
    expect(dataSource.findOne).toHaveBeenCalledWith('7', transaction);
    expect(dataSource.update).toHaveBeenCalledWith('7', updateData, transaction);
    expect(dataSource.delete).toHaveBeenCalledWith('7');
    expect(dataSource.findActiveByInvestment).toHaveBeenCalledWith('5');
    expect(dataSource.createPlanWithHistoricalEvents).toHaveBeenCalledWith(confirmationData, transaction);
    expect(dataSource.skipCurrentContribution).toHaveBeenCalledWith(skipData);
    expect(dataSource.generateDueRecurringInvestmentEvents).toHaveBeenCalledWith({
      cutoffDate: cutoff,
      limit: 20,
    });
  });
});