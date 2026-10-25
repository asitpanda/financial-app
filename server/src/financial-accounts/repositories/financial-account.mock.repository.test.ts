import { describe, expect, it } from 'vitest';
import { FinancialAccountMockRepository } from './financial-account.mock.repository';

describe('FinancialAccountMockRepository', () => {
  describe('create', () => {
    it('creates an owned account and supplies defaults for optional fields', async () => {
      const repository = new FinancialAccountMockRepository();
      const userId = 9201;

      const created = await repository.create(
        {
          name: 'cash',
          displayName: 'Cash account',
          accountType: 'cash',
          currency: 'USD',
        },
        String(userId),
      );

      try {
        expect(created).toMatchObject({
          name: 'cash',
          displayName: 'Cash account',
          accountType: 'cash',
          currency: 'USD',
          institutionName: null,
          accountNumberMasked: null,
          isActive: true,
          openingBalance: 0,
          userId,
        });
        expect(created.id).toBeGreaterThan(0);
        expect(created.createdAt).toBeInstanceOf(Date);
      } finally {
        await repository.delete(String(created.id), String(userId));
      }
    });
  });

  describe('findAll', () => {
    it('returns only accounts owned by the requested user', async () => {
      const repository = new FinancialAccountMockRepository();

      await expect(repository.findAll('1')).resolves.toHaveLength(5);
      await expect(repository.findAll('9202')).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('does not expose an account to a different owner', async () => {
      const repository = new FinancialAccountMockRepository();

      await expect(repository.findOne('1', '9203')).resolves.toBeNull();
      await expect(repository.findOne('1', '1')).resolves.toMatchObject({
        id: 1,
        userId: 1,
      });
    });
  });

  describe('update', () => {
    it('updates an owned account and leaves it unchanged for a different owner', async () => {
      const repository = new FinancialAccountMockRepository();
      const userId = '9204';
      const created = await repository.create(
        {
          name: 'savings',
          displayName: 'Savings',
          accountType: 'bank',
          currency: 'USD',
        },
        userId,
      );

      try {
        await expect(
          repository.update(String(created.id), { displayName: 'Updated savings' }, '9205'),
        ).resolves.toBeNull();
        await expect(
          repository.update(String(created.id), { displayName: 'Updated savings' }, userId),
        ).resolves.toMatchObject({
          id: created.id,
          userId: Number(userId),
          displayName: 'Updated savings',
        });
      } finally {
        await repository.delete(String(created.id), userId);
      }
    });
  });

  describe('delete', () => {
    it('preserves another owner’s account and removes it for its owner', async () => {
      const repository = new FinancialAccountMockRepository();
      const userId = '9206';
      const created = await repository.create(
        {
          name: 'reserve',
          displayName: 'Reserve',
          accountType: 'bank',
          currency: 'USD',
        },
        userId,
      );

      try {
        await repository.delete(String(created.id), '9207');
        await expect(repository.findOne(String(created.id), userId)).resolves.toEqual(created);

        await repository.delete(String(created.id), userId);

        await expect(repository.findOne(String(created.id), userId)).resolves.toBeNull();
      } finally {
        await repository.delete(String(created.id), userId);
      }
    });
  });

  describe('sumTransactionFlows', () => {
    it('includes income and investment flows and initializes accounts without activity', async () => {
      const repository = new FinancialAccountMockRepository();

      await expect(repository.sumTransactionFlows([1, 5, 999999])).resolves.toEqual(
        new Map([
          [1, { incoming: 78500, outgoing: 43139 }],
          [5, { incoming: 900, outgoing: 5980 }],
          [999999, { incoming: 0, outgoing: 0 }],
        ]),
      );
    });

    it('returns an empty map when no account IDs are provided', async () => {
      const repository = new FinancialAccountMockRepository();

      await expect(repository.sumTransactionFlows([])).resolves.toEqual(new Map());
    });
  });
});