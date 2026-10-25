import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvestmentMockRepository } from './investment.mock.repository';

describe('InvestmentMockRepository', () => {
  let repository: InvestmentMockRepository;

  beforeEach(async () => {
    vi.resetModules();
    const { InvestmentMockRepository: Repository } = await import('./investment.mock.repository');
    repository = new Repository();
  });

  describe('create', () => {
    it('normalizes optional values and applies the category accounting treatment', async () => {
      const input = {
        name: 'Policy savings',
        assetType: 'INSURANCE',
        assetCategory: 'LIFE_INSURANCE',
        institutionName: 'Example insurer',
        status: 'active',
        currency: 'USD',
        totalInvested: 0,
        currentValue: 0,
        startDate: '2026-01-01T00:00:00.000Z',
      };

      const created = await repository.create(input as never, 9201);

      expect(created).toMatchObject({
        name: 'Policy savings',
        userId: 9201,
        accountId: null,
        assetTaxonomyId: null,
        assetTypeMetaId: 5,
        assetCategoryMetaId: 23,
        accountingTreatment: 'INSURANCE_SAVINGS',
        accountingTreatmentOverride: null,
        currentValue: 0,
        startDate: new Date(input.startDate),
        maturityDate: null,
      });
    });
  });

  describe('findPage', () => {
    it('filters case-insensitively within the owner and applies pagination', async () => {
      const result = await repository.findPage(1, {
        page: 1,
        limit: 1,
        search: 'axis',
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(result).toMatchObject({
        total: 1,
        items: [{ id: 1, userId: 1, name: 'Axis Bluechip SIP' }],
      });
      await expect(repository.findPage(9202, { page: 1, limit: 10, search: 'axis' })).resolves.toEqual({
        items: [],
        total: 0,
      });
    });
  });

  describe('findOne', () => {
    it('does not return an investment to a different owner', async () => {
      await expect(repository.findOne(1, 9203)).resolves.toBeNull();
      await expect(repository.findOne(1, 1)).resolves.toMatchObject({ id: 1, userId: 1 });
    });
  });

  describe('update', () => {
    it('updates only an owned investment and normalizes changed values', async () => {
      await expect(repository.update(1, { accountId: '9', startDate: '2026-05-01T00:00:00.000Z' } as never, 9204)).resolves.toBeNull();

      const updated = await repository.update(
        1,
        { accountId: '9', startDate: '2026-05-01T00:00:00.000Z' } as never,
        1,
      );

      expect(updated).toMatchObject({
        id: 1,
        accountId: 9,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
      });
    });
  });

  describe('delete', () => {
    it('preserves another owner’s investment and removes it for its owner', async () => {
      const created = await repository.create(
        {
          name: 'Temporary holding',
          assetType: 'EQUITY',
          assetCategory: 'STOCK',
          institutionName: 'Broker',
          status: 'active',
          currency: 'USD',
          totalInvested: 0,
          currentValue: 0,
        } as never,
        9205,
      );

      await repository.delete(created.id, 9206);
      await expect(repository.findOne(created.id, 9205)).resolves.toEqual(created);

      await repository.delete(created.id, 9205);

      await expect(repository.findOne(created.id, 9205)).resolves.toBeNull();
    });
  });
});