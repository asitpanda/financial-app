import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FinancialAccountRecord } from './financial-account.types';
import { FinancialAccountsService } from './financial-accounts.service';
import { FinancialAccountRepository } from './repositories/financial-account.repository';

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    sumTransactionFlows: vi.fn(),
  };

  return {
    service: new FinancialAccountsService(repository as unknown as FinancialAccountRepository),
    repository,
  };
}

function account(overrides: Partial<FinancialAccountRecord> = {}): FinancialAccountRecord {
  return {
    id: 1,
    userId: 42,
    name: 'checking',
    displayName: 'Checking account',
    accountType: 'bank',
    institutionName: null,
    accountNumberMasked: null,
    currency: 'USD',
    isActive: true,
    openingBalance: 100,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('FinancialAccountsService', () => {
  let service: FinancialAccountsService;
  let repository: ReturnType<typeof createService>['repository'];

  beforeEach(() => {
    ({ service, repository } = createService());
  });

  describe('create', () => {
    it('passes the account data and stringified owner ID to the repository', async () => {
      const data = { name: 'checking' };
      repository.create.mockResolvedValue(account());

      await expect(service.create(data as never, 42)).resolves.toEqual(account());
      expect(repository.create).toHaveBeenCalledWith(data, '42');
    });
  });

  describe('findAll', () => {
    it('adds current balances using incoming and outgoing transaction flows', async () => {
      const accounts = [account(), account({ id: 2, openingBalance: 250 })];
      repository.findAll.mockResolvedValue(accounts);
      repository.sumTransactionFlows.mockResolvedValue(
        new Map([
          [1, { incoming: 75, outgoing: 25 }],
          [2, { incoming: 10, outgoing: 90 }],
        ]),
      );

      await expect(service.findAll(42)).resolves.toEqual([
        { ...accounts[0], currentBalance: 150 },
        { ...accounts[1], currentBalance: 170 },
      ]);
      expect(repository.findAll).toHaveBeenCalledWith('42');
      expect(repository.sumTransactionFlows).toHaveBeenCalledWith([1, 2]);
    });

    it('uses the opening balance when an account has no transaction flows', async () => {
      const savedAccount = account({ openingBalance: 0 });
      repository.findAll.mockResolvedValue([savedAccount]);
      repository.sumTransactionFlows.mockResolvedValue(new Map());

      await expect(service.findAll(42)).resolves.toEqual([
        { ...savedAccount, currentBalance: 0 },
      ]);
    });
  });

  describe('findOne', () => {
    it('returns null without summing flows when the account is not owned by the user', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(7, 42)).resolves.toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith('7', '42');
      expect(repository.sumTransactionFlows).not.toHaveBeenCalled();
    });

    it('adds the current balance to an owned account', async () => {
      const savedAccount = account({ id: 7, openingBalance: 300 });
      repository.findOne.mockResolvedValue(savedAccount);
      repository.sumTransactionFlows.mockResolvedValue(
        new Map([[7, { incoming: 40, outgoing: 15 }]]),
      );

      await expect(service.findOne(7, 42)).resolves.toEqual({
        ...savedAccount,
        currentBalance: 325,
      });
      expect(repository.sumTransactionFlows).toHaveBeenCalledWith([7]);
    });
  });

  describe('update', () => {
    it('passes the account ID, data, and stringified owner ID to the repository', async () => {
      const data = { displayName: 'Everyday checking' };
      repository.update.mockResolvedValue(account({ displayName: data.displayName }));

      await expect(service.update(7, data as never, 42)).resolves.toMatchObject(data);
      expect(repository.update).toHaveBeenCalledWith('7', data, '42');
    });
  });

  describe('remove', () => {
    it('passes the account ID and stringified owner ID to the repository', async () => {
      repository.delete.mockResolvedValue(undefined);

      await expect(service.remove(7, 42)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith('7', '42');
    });
  });

  describe('withCurrentBalance', () => {
    it('returns no accounts when given an empty list', async () => {
      repository.sumTransactionFlows.mockResolvedValue(new Map());

      await expect(service.withCurrentBalance([])).resolves.toEqual([]);
      expect(repository.sumTransactionFlows).toHaveBeenCalledWith([]);
    });
  });

  describe('getCurrentBalance', () => {
    it('returns the opening balance adjusted by the account transaction flows', async () => {
      repository.sumTransactionFlows.mockResolvedValue(
        new Map([[1, { incoming: 55, outgoing: 5 }]]),
      );

      await expect(service.getCurrentBalance(account())).resolves.toBe(150);
      expect(repository.sumTransactionFlows).toHaveBeenCalledWith([1]);
    });
  });
});