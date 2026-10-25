import { BadRequestException } from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import { FinancialAccountsService } from '../financial-accounts/financial-accounts.service';
import { InvestmentContributionPlansService } from '../investment-contribution-plans/investment-contribution-plans.service';
import { InvestmentEventsService } from '../investment-events/investment-events.service';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionsService } from './transactions.service';

function createService() {
  const repository = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByDateRange: vi.fn(),
    findByType: vi.fn(),
  };
  const investmentEventsService = { create: vi.fn() };
  const contributionPlansService = {
    findOne: vi.fn(),
    findAllByInvestment: vi.fn().mockResolvedValue([]),
    advanceNextDueDate: vi.fn(),
  };
  const investmentRepository = { findOne: vi.fn() };
  const financialAccountsService = {
    findOne: vi.fn().mockResolvedValue({ currentBalance: 1_000 }),
  };
  const transaction = {
    investmentEvent: { findFirst: vi.fn().mockResolvedValue(null) },
    transaction: { findFirst: vi.fn() },
    investment: { findFirst: vi.fn() },
    investmentContributionPlan: { findFirst: vi.fn().mockResolvedValue(null) },
    financialAccount: { findFirst: vi.fn().mockResolvedValue({ id: 9, currency: 'USD' }) },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(transaction)),
  };

  return {
    service: new TransactionsService(
      repository as unknown as TransactionRepository,
      investmentEventsService as unknown as InvestmentEventsService,
      contributionPlansService as unknown as InvestmentContributionPlansService,
      investmentRepository as unknown as InvestmentRepository,
      financialAccountsService as unknown as FinancialAccountsService,
      prisma as unknown as PrismaService,
    ),
    repository,
    investmentEventsService,
    contributionPlansService,
    investmentRepository,
    financialAccountsService,
    prisma,
    transaction,
  };
}

function investment(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    accountId: 9,
    currency: 'USD',
    status: 'active',
    totalInvested: 200,
    accountingTreatmentOverride: null,
    assetCategoryRef: { accountingTreatment: 'INVESTMENT' },
    assetTypeRef: null,
    ...overrides,
  };
}

function contributionInput(overrides: Record<string, unknown> = {}) {
  return {
    investmentId: '7',
    amount: 75,
    transactionDate: '2026-10-25',
    ...overrides,
  };
}

function withdrawalInput(overrides: Record<string, unknown> = {}) {
  return {
    investmentId: '7',
    amount: 50,
    transactionDate: '2026-10-25',
    ...overrides,
  };
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: ReturnType<typeof createService>['repository'];
  let investmentEventsService: ReturnType<typeof createService>['investmentEventsService'];
  let contributionPlansService: ReturnType<typeof createService>['contributionPlansService'];
  let investmentRepository: ReturnType<typeof createService>['investmentRepository'];
  let financialAccountsService: ReturnType<typeof createService>['financialAccountsService'];
  let prisma: ReturnType<typeof createService>['prisma'];
  let transaction: ReturnType<typeof createService>['transaction'];

  beforeEach(() => {
    ({
      service,
      repository,
      investmentEventsService,
      contributionPlansService,
      investmentRepository,
      financialAccountsService,
      prisma,
      transaction,
    } = createService());
  });

  describe('findAll', () => {
    it('returns transactions belonging to the requested user', async () => {
      const records = [{ id: 1 }];
      repository.findAll.mockResolvedValue(records);

      await expect(service.findAll(42)).resolves.toBe(records);
      expect(repository.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findOne', () => {
    it('returns the transaction for the requested user', async () => {
      const record = { id: 12 };
      repository.findOne.mockResolvedValue(record);

      await expect(service.findOne(12, 42)).resolves.toBe(record);
      expect(repository.findOne).toHaveBeenCalledWith(12, 42);
    });
  });

  describe('create', () => {
    it('rejects an expense that exceeds the source account balance', async () => {
      financialAccountsService.findOne.mockResolvedValue({ currentBalance: 40 });

      await expect(
        service.create({ type: 'EXPENSE', amount: 41, sourceAccountId: 9 } as never, 42),
      ).rejects.toThrow('Insufficient balance in source account. Available: 40.00, requested: 41.00.');
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns null without persisting when the transaction does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(12, { notes: 'updated' }, 42)).resolves.toBeNull();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('restores the existing expense amount before validating its replacement amount', async () => {
      const existing = { id: 12, type: 'EXPENSE', amount: 80, sourceAccountId: 9, investment: null };
      repository.findOne.mockResolvedValue(existing);
      financialAccountsService.findOne.mockResolvedValue({ currentBalance: 20 });
      repository.update.mockResolvedValue({ ...existing, amount: 100 });

      await expect(
        service.update(12, { type: 'EXPENSE', amount: 100, sourceAccountId: 9 }, 42),
      ).resolves.toMatchObject({ amount: 100 });
      expect(repository.update).toHaveBeenCalledWith(
        12,
        { type: 'EXPENSE', amount: 100, sourceAccountId: 9 },
        42,
      );
    });
  });

  describe('remove', () => {
    it('rejects deleting a transaction linked to investment activity', async () => {
      repository.findOne.mockResolvedValue({ id: 12, investment: { id: 7 } });
      investmentRepository.findOne.mockResolvedValue(investment());

      await expect(service.remove(12, 42)).rejects.toThrow(
        'Transactions linked to investment activity cannot be edited or deleted independently.',
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByDateRange', () => {
    it('passes the user and date boundaries to the repository', async () => {
      const startDate = new Date('2026-10-01T00:00:00.000Z');
      const endDate = new Date('2026-10-31T00:00:00.000Z');

      await service.findByDateRange(42, startDate, endDate);

      expect(repository.findByDateRange).toHaveBeenCalledWith(42, startDate, endDate);
    });
  });

  describe('findByType', () => {
    it('passes the user and transaction type to the repository', async () => {
      await service.findByType(42, 'EXPENSE');

      expect(repository.findByType).toHaveBeenCalledWith(42, 'EXPENSE');
    });
  });

  describe('recordContribution', () => {
    it('creates linked cash and investment activity in a serializable transaction', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      const savedTransaction = { id: 22 };
      const savedEvent = { id: 31 };
      repository.create.mockResolvedValue(savedTransaction);
      investmentEventsService.create.mockResolvedValue(savedEvent);

      await expect(service.recordContribution(contributionInput() as never, 42)).resolves.toMatchObject({
        transaction: savedTransaction,
        investmentEvent: savedEvent,
        message: 'Contribution recorded successfully',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INVESTMENT',
          sourceAccountId: 9,
          amount: 75,
          date: '2026-10-25',
        }),
        42,
        transaction,
      );
      expect(investmentEventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          investmentId: '7',
          linkedTransactionId: '22',
          eventType: InvestmentEventType.CONTRIBUTION,
          amount: 75,
        }),
        42,
        transaction,
      );
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('returns the prior activity for a matching request ID without creating duplicates', async () => {
      const priorEvent = {
        id: 31,
        investmentId: 7,
        recurringPlanId: null,
        linkedTransactionId: 22,
        eventType: InvestmentEventType.CONTRIBUTION,
        eventDate: new Date('2026-10-25T00:00:00.000Z'),
        amount: { toNumber: () => 75 },
        pricePerUnit: null,
        netAmount: { toNumber: () => 75 },
      };
      const priorTransaction = { id: 22 };
      transaction.investmentEvent.findFirst.mockResolvedValue(priorEvent);
      transaction.transaction.findFirst.mockResolvedValue(priorTransaction);

      await expect(
        service.recordContribution(
          contributionInput({ requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7' }) as never,
          42,
        ),
      ).resolves.toMatchObject({ transaction: priorTransaction, investmentEvent: { amount: 75 } });
      expect(repository.create).not.toHaveBeenCalled();
      expect(investmentEventsService.create).not.toHaveBeenCalled();
    });
  });

  describe('recordWithdrawal', () => {
    it('rejects a withdrawal greater than the investment principal', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment({ totalInvested: 40 }));

      await expect(service.recordWithdrawal(withdrawalInput({ amount: 41 }) as never, 42)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(investmentEventsService.create).not.toHaveBeenCalled();
    });

    it('records a principal withdrawal as linked income and investment activity', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      const savedTransaction = { id: 23 };
      repository.create.mockResolvedValue(savedTransaction);

      await expect(service.recordWithdrawal(withdrawalInput() as never, 42)).resolves.toMatchObject({
        transaction: savedTransaction,
        message: 'Withdrawal recorded successfully',
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INCOME',
          destinationAccountId: 9,
          amount: 50,
        }),
        42,
        transaction,
      );
      expect(investmentEventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          linkedTransactionId: '23',
          eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL,
          amount: 50,
        }),
        42,
        transaction,
      );
    });
  });
});