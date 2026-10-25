import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IInvestmentDataSourcePort } from './investment.datasource.port';
import { InvestmentRepository } from './investment.repository';

function createRepository() {
  const dataSource = {
    create: vi.fn(),
    findAll: vi.fn(),
    findPage: vi.fn(),
    findAllForPortfolio: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    repository: new InvestmentRepository(dataSource as unknown as IInvestmentDataSourcePort),
    dataSource,
  };
}

describe('InvestmentRepository', () => {
  let repository: InvestmentRepository;
  let dataSource: ReturnType<typeof createRepository>['dataSource'];

  beforeEach(() => {
    ({ repository, dataSource } = createRepository());
  });

  describe('create', () => {
    it('forwards investment data, owner, and transaction to the data source', async () => {
      const data = { name: 'Long-term fund' };
      const transaction = {};
      const saved = { id: 12 };
      dataSource.create.mockResolvedValue(saved);

      await expect(repository.create(data as never, 42, transaction as never)).resolves.toBe(saved);
      expect(dataSource.create).toHaveBeenCalledWith(data, 42, transaction);
    });
  });

  describe('findAll', () => {
    it('forwards the owner and returns the data source result', async () => {
      const investments = [{ id: 12 }];
      dataSource.findAll.mockResolvedValue(investments);

      await expect(repository.findAll(42)).resolves.toBe(investments);
      expect(dataSource.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findPage', () => {
    it('forwards the owner and listing query', async () => {
      const query = { page: 2, limit: 10 };
      const result = { items: [{ id: 12 }], total: 1 };
      dataSource.findPage.mockResolvedValue(result);

      await expect(repository.findPage(42, query)).resolves.toBe(result);
      expect(dataSource.findPage).toHaveBeenCalledWith(42, query);
    });
  });

  describe('findAllForPortfolio', () => {
    it('forwards the owner to the portfolio query', async () => {
      const investments = [{ id: 12 }];
      dataSource.findAllForPortfolio.mockResolvedValue(investments);

      await expect(repository.findAllForPortfolio(42)).resolves.toBe(investments);
      expect(dataSource.findAllForPortfolio).toHaveBeenCalledWith(42);
    });
  });

  describe('findOne', () => {
    it('forwards the investment and owner identifiers', async () => {
      const investment = { id: 12 };
      dataSource.findOne.mockResolvedValue(investment);

      await expect(repository.findOne(12, 42)).resolves.toBe(investment);
      expect(dataSource.findOne).toHaveBeenCalledWith(12, 42);
    });
  });

  describe('findById', () => {
    it('forwards the investment identifier without an owner filter', async () => {
      dataSource.findById.mockResolvedValue(null);

      await expect(repository.findById(12)).resolves.toBeNull();
      expect(dataSource.findById).toHaveBeenCalledWith(12);
    });
  });

  describe('update', () => {
    it('forwards the investment changes, owner, and transaction', async () => {
      const data = { currentValue: 900 };
      const transaction = {};
      dataSource.update.mockResolvedValue({ id: 12 });

      await expect(repository.update(12, data as never, 42, transaction as never)).resolves.toEqual({ id: 12 });
      expect(dataSource.update).toHaveBeenCalledWith(12, data, 42, transaction);
    });
  });

  describe('delete', () => {
    it('forwards the investment and owner identifiers', async () => {
      await expect(repository.delete(12, 42)).resolves.toBeUndefined();
      expect(dataSource.delete).toHaveBeenCalledWith(12, 42);
    });
  });
});