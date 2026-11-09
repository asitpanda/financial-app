import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvestmentMockRepository } from './investment.mock.repository';

const createInvestmentInput = (overrides: Record<string, unknown> = {}) => ({
  name: 'Mock holding',
  assetType: 'EQUITY',
  assetCategory: 'STOCK',
  institutionName: 'Broker',
  status: 'active',
  currency: 'USD',
  totalInvested: 100,
  currentValue: 100,
  startDate: '2026-01-01T00:00:00.000Z',
  contributionMode: 'ONE_TIME',
  ...overrides,
});

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

    it.each([
      ['ULIP', 'INSURANCE_SAVINGS'],
      ['HEALTH_INSURANCE', 'PROTECTION_EXPENSE'],
      ['LIC_MONEY_BACK', 'INSURANCE_SAVINGS'],
      ['ENDOWMENT', 'INSURANCE_SAVINGS'],
      ['TERM_INSURANCE', 'PROTECTION_EXPENSE'],
      ['RETURN_OF_PREMIUM_TERM', 'INSURANCE_SAVINGS'],
      ['OTHER_ALTERNATIVE', 'INVESTMENT'],
    ])('resolves %s to the configured default accounting treatment', async (assetCategory, accountingTreatment) => {
      const created = await repository.create(
        createInvestmentInput({ assetType: 'INSURANCE', assetCategory }) as never,
        9201,
      );

      expect(created.accountingTreatment).toBe(accountingTreatment);
    });

    it('honors an explicit accounting treatment override over the category default', async () => {
      const created = await repository.create(
        createInvestmentInput({
          assetType: 'INSURANCE',
          assetCategory: 'HEALTH_INSURANCE',
          accountingTreatmentOverride: 'INSURANCE_SAVINGS',
        }) as never,
        9201,
      );

      expect(created).toMatchObject({
        accountingTreatment: 'INSURANCE_SAVINGS',
        accountingTreatmentOverride: 'INSURANCE_SAVINGS',
      });
    });
  });

  describe('findAll', () => {
    it('returns only records belonging to the requested owner', async () => {
      await repository.create(createInvestmentInput({ name: 'Owner A' }) as never, 9201);
      await repository.create(createInvestmentInput({ name: 'Owner B' }) as never, 9202);

      await expect(repository.findAll(9201)).resolves.toMatchObject([{ name: 'Owner A', userId: 9201 }]);
    });
  });

  describe('findAllForPortfolio', () => {
    it('excludes closed investments and records belonging to other users', async () => {
      await repository.create(createInvestmentInput({ name: 'Active holding' }) as never, 9201);
      await repository.create(createInvestmentInput({ name: 'Closed holding', status: 'closed' }) as never, 9201);
      await repository.create(createInvestmentInput({ name: 'Other owner holding' }) as never, 9202);

      await expect(repository.findAllForPortfolio(9201)).resolves.toMatchObject([
        { name: 'Active holding', status: 'active', userId: 9201 },
      ]);
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

    it.each([
      ['institution name', { institutionName: 'North Bank' }, 'north'],
      ['reference number', { referenceNumber: 'REF-42' }, 'ref-42'],
    ])('searches by %s without requiring a name match', async (_field, searchableValue, search) => {
      const investment = await repository.create(
        createInvestmentInput({ name: 'Unrelated holding', ...searchableValue }) as never,
        9210,
      );

      await expect(repository.findPage(9210, { page: 1, limit: 10, search })).resolves.toMatchObject({
        total: 1,
        items: [{ id: investment.id }],
      });
    });

    it('applies ID, status, asset type, accounting treatment, and search filters', async () => {
      const equity = await repository.create(createInvestmentInput({ name: 'Growth fund' }) as never, 9207);
      const savingsPolicy = await repository.create(
        createInvestmentInput({
          name: 'Savings policy',
          assetType: 'INSURANCE',
          assetCategory: 'LIFE_INSURANCE',
        }) as never,
        9207,
      );
      const protectionPolicy = await repository.create(
        createInvestmentInput({
          name: 'Protection policy',
          assetType: 'INSURANCE',
          assetCategory: 'HEALTH_INSURANCE',
          status: 'closed',
        }) as never,
        9207,
      );
      const query = { page: 1, limit: 10 };

      await expect(repository.findPage(9207, { ...query, ids: [equity.id] })).resolves.toMatchObject({
        total: 1,
        items: [{ id: equity.id }],
      });
      await expect(repository.findPage(9207, { ...query, status: 'closed' })).resolves.toMatchObject({
        total: 1,
        items: [{ id: protectionPolicy.id }],
      });
      await expect(repository.findPage(9207, { ...query, assetType: 'INSURANCE' })).resolves.toMatchObject({
        total: 2,
      });
      await expect(repository.findPage(9207, { ...query, accountingTreatment: 'INSURANCE_SAVINGS' })).resolves.toMatchObject({
        total: 1,
        items: [{ id: savingsPolicy.id }],
      });
      await expect(repository.findPage(9207, { ...query, search: 'PROTECTION' })).resolves.toMatchObject({
        total: 1,
        items: [{ id: protectionPolicy.id }],
      });
    });

    it('sorts null values last and breaks ties by ID', async () => {
      const firstNull = await repository.create(createInvestmentInput({ name: 'First null' }) as never, 9208);
      const dated = await repository.create(
        createInvestmentInput({ name: 'Dated', maturityDate: '2026-12-01T00:00:00.000Z' }) as never,
        9208,
      );
      const secondNull = await repository.create(createInvestmentInput({ name: 'Second null' }) as never, 9208);

      const result = await repository.findPage(9208, {
        page: 1,
        limit: 10,
        sortBy: 'maturityDate',
        sortDirection: 'asc',
      });

      expect(result.items.map((investment) => investment.id)).toEqual([
        dated.id,
        firstNull.id,
        secondNull.id,
      ]);
    });
  });

  describe('findOne', () => {
    it('does not return an investment to a different owner', async () => {
      await expect(repository.findOne(1, 9203)).resolves.toBeNull();
      await expect(repository.findOne(1, 1)).resolves.toMatchObject({ id: 1, userId: 1 });
    });
  });

  describe('findById', () => {
    it('returns a record by ID regardless of owner and null for a missing ID', async () => {
      const created = await repository.create(createInvestmentInput() as never, 9209);

      await expect(repository.findById(created.id)).resolves.toMatchObject({
        id: created.id,
        userId: 9209,
      });
      await expect(repository.findById(-1)).resolves.toBeNull();
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

    it('updates category metadata and resolves the new accounting treatment', async () => {
      const updated = await repository.update(1, { assetCategory: 'HEALTH_INSURANCE' } as never, 1);

      expect(updated).toMatchObject({
        id: 1,
        assetCategory: 'HEALTH_INSURANCE',
        assetCategoryMetaId: 25,
        accountingTreatment: 'PROTECTION_EXPENSE',
      });
    });

    it('normalizes cleared nullable account and taxonomy IDs to null', async () => {
      const updated = await repository.update(1, { accountId: null, assetTaxonomyId: '' } as never, 1);

      expect(updated).toMatchObject({ accountId: null, assetTaxonomyId: null });
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