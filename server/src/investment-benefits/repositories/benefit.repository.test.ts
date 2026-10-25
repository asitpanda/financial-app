import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BenefitRepository } from './benefit.repository';

function createRepository() {
  const dataSource = {
    create: vi.fn(),
    findAll: vi.fn(),
    findAllByInvestment: vi.fn(),
    findAllByInvestmentWithDetails: vi.fn(),
    findOne: vi.fn(),
    findOneWithDetails: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    realize: vi.fn(),
    quickRealize: vi.fn(),
  };

  return { dataSource };
}

describe('BenefitRepository', () => {
  let repository: BenefitRepository;
  let dataSource: ReturnType<typeof createRepository>['dataSource'];

  beforeEach(async () => {
    const { BenefitRepository: Repository } = await import('./benefit.repository');
    ({ dataSource } = createRepository());
    repository = new Repository(dataSource as never);
  });

  it('forwards benefit operations and their arguments to the configured data source', async () => {
    const createData = { amount: 20 };
    const updateData = { notes: 'Updated' };
    const realizeData = { components: [] };
    const quickRealizeData = { amount: 20 };

    await repository.create('7', createData as never);
    await repository.findAll(42);
    await repository.findAllByInvestment('7');
    await repository.findAllByInvestmentWithDetails('7');
    await repository.findOne('3');
    await repository.findOneWithDetails('3');
    await repository.update('3', updateData as never);
    await repository.delete('3');
    await repository.realize('3', '7', 42, realizeData as never);
    await repository.quickRealize('7', 42, quickRealizeData as never);

    expect(dataSource.create).toHaveBeenCalledWith('7', createData);
    expect(dataSource.findAll).toHaveBeenCalledWith(42);
    expect(dataSource.findAllByInvestment).toHaveBeenCalledWith('7');
    expect(dataSource.findAllByInvestmentWithDetails).toHaveBeenCalledWith('7');
    expect(dataSource.findOne).toHaveBeenCalledWith('3');
    expect(dataSource.findOneWithDetails).toHaveBeenCalledWith('3');
    expect(dataSource.update).toHaveBeenCalledWith('3', updateData);
    expect(dataSource.delete).toHaveBeenCalledWith('3');
    expect(dataSource.realize).toHaveBeenCalledWith('3', '7', 42, realizeData);
    expect(dataSource.quickRealize).toHaveBeenCalledWith('7', 42, quickRealizeData);
  });
});