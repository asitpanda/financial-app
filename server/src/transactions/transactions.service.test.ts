import { BadRequestException, ConflictException } from '@nestjs/common';
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
    findPage: vi.fn(),
    findAllForAccount: vi.fn(),
    getPeriodTypeTotals: vi.fn(),
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
    findAll: vi.fn().mockResolvedValue([]),
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

  describe('findPage', () => {
    it('rejects an inverted date range before querying repositories', async () => {
      await expect(service.findPage(42, {
        page: 1,
        limit: 10,
        fromDate: '2026-10-31',
        toDate: '2026-10-01',
      })).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.findPage).not.toHaveBeenCalled();
      expect(financialAccountsService.findOne).not.toHaveBeenCalled();
    });

    it('rejects an account filter when the account does not belong to the user', async () => {
      financialAccountsService.findOne.mockResolvedValue(null);

      await expect(service.findPage(42, { page: 1, limit: 10, accountId: 9 })).rejects.toThrow(
        'The selected account does not exist.',
      );
      expect(financialAccountsService.findOne).toHaveBeenCalledWith(9, 42);
      expect(repository.findPage).not.toHaveBeenCalled();
    });

    it('calculates account ledger balances and period totals across inclusive date boundaries', async () => {
      const beforePeriod = {
        id: 1, type: 'INCOME', amount: 40, sourceAccountId: null, destinationAccountId: 9,
        date: new Date('2026-10-01T23:59:59.999Z'),
      };
      const expense = {
        id: 2, type: 'EXPENSE', amount: 25, sourceAccountId: 9, destinationAccountId: null,
        date: new Date('2026-10-02T00:00:00.000Z'),
      };
      const transfer = {
        id: 3, type: 'TRANSFER', amount: 20, sourceAccountId: null, destinationAccountId: 9,
        date: new Date('2026-10-03T23:59:59.999Z'),
      };
      const afterPeriod = {
        id: 4, type: 'EXPENSE', amount: 100, sourceAccountId: 9, destinationAccountId: null,
        date: new Date('2026-10-04T00:00:00.000Z'),
      };
      financialAccountsService.findOne.mockResolvedValue({ id: 9, openingBalance: 100 });
      repository.findPage.mockResolvedValue({ items: [expense, transfer], total: 2 });
      repository.findAllForAccount.mockResolvedValue([beforePeriod, expense, transfer, afterPeriod]);

      await expect(service.findPage(42, {
        page: 1,
        limit: 10,
        accountId: 9,
        fromDate: '2026-10-02T00:00:00.000Z',
        toDate: '2026-10-03T23:59:59.999Z',
      })).resolves.toMatchObject({
        data: [
          { id: 2, debitAmount: 25, creditAmount: 0, balanceAfter: 115 },
          { id: 3, debitAmount: 0, creditAmount: 20, balanceAfter: 135 },
        ],
        summary: {
          totalIncome: null,
          totalExpense: null,
          net: null,
          transactionCount: 2,
          openingBalance: 140,
          moneyIn: 20,
          moneyOut: 25,
          closingBalance: 135,
          multiCurrency: false,
        },
      });
      expect(repository.findAllForAccount).toHaveBeenCalledWith(42, 9);
      expect(repository.getPeriodTypeTotals).not.toHaveBeenCalled();
    });

    it('returns period income and expense summaries when no account is selected', async () => {
      const record = { id: 5, type: 'EXPENSE', amount: 40 };
      repository.findPage.mockResolvedValue({ items: [record], total: 3 });
      repository.getPeriodTypeTotals.mockResolvedValue([
        { type: 'INCOME', amount: 300, count: 2 },
        { type: 'EXPENSE', amount: 120, count: 3 },
      ]);
      financialAccountsService.findAll.mockResolvedValue([{ currency: 'USD' }]);

      await expect(service.findPage(42, { page: 2, limit: 1, fromDate: '2026-10-01', toDate: '2026-10-31' }))
        .resolves.toMatchObject({
          data: [{ id: 5, debitAmount: null, creditAmount: null, balanceAfter: null }],
          summary: {
            totalIncome: 300,
            totalExpense: 120,
            net: 180,
            transactionCount: 5,
            openingBalance: null,
            moneyIn: null,
            moneyOut: null,
            closingBalance: null,
            multiCurrency: false,
          },
        });
      expect(repository.getPeriodTypeTotals).toHaveBeenCalledWith(42, '2026-10-01', '2026-10-31');
      expect(financialAccountsService.findAll).toHaveBeenCalledWith(42);
    });

    it('suppresses cross-currency totals while retaining transaction counts', async () => {
      repository.findPage.mockResolvedValue({ items: [], total: 0 });
      repository.getPeriodTypeTotals.mockResolvedValue([
        { type: 'INCOME', amount: 300, count: 2 },
        { type: 'EXPENSE', amount: 120, count: 3 },
      ]);
      financialAccountsService.findAll.mockResolvedValue([{ currency: 'USD' }, { currency: 'EUR' }]);

      await expect(service.findPage(42, { page: 1, limit: 10 })).resolves.toMatchObject({
        data: [],
        summary: {
          totalIncome: null,
          totalExpense: null,
          net: null,
          transactionCount: 5,
          multiCurrency: true,
        },
      });
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

    it('persists an expense when the requested amount fits the source account balance', async () => {
      const createDto = { type: 'EXPENSE', amount: 40, sourceAccountId: 9 };
      const saved = { id: 13 };
      financialAccountsService.findOne.mockResolvedValue({ currentBalance: 40 });
      repository.create.mockResolvedValue(saved);

      await expect(service.create(createDto as never, 42)).resolves.toBe(saved);
      expect(financialAccountsService.findOne).toHaveBeenCalledWith(9, 42);
      expect(repository.create).toHaveBeenCalledWith(createDto, 42);
    });

    it.each(['INCOME', 'TRANSFER'])('does not apply an expense balance guard to %s transactions', async (type) => {
      const createDto = { type, amount: 500, sourceAccountId: 9 };
      repository.create.mockResolvedValue({ id: 13 });

      await service.create(createDto as never, 42);

      expect(financialAccountsService.findOne).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(createDto, 42);
    });

    it('skips balance lookup when an expense has no usable source account ID', async () => {
      const createDto = { type: 'EXPENSE', amount: 50 };
      repository.create.mockResolvedValue({ id: 13 });

      await service.create(createDto as never, 42);

      expect(financialAccountsService.findOne).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(createDto, 42);
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

    it('rejects independent edits to an open investment-linked transaction', async () => {
      repository.findOne.mockResolvedValue({
        id: 12, type: 'INCOME', amount: 50, sourceAccountId: null, investment: { id: 7 },
      });
      investmentRepository.findOne.mockResolvedValue(investment());

      await expect(service.update(12, { notes: 'Changed' }, 42)).rejects.toThrow(
        'Transactions linked to investment activity cannot be edited or deleted independently.',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects edits to a linked transaction when its investment is closed', async () => {
      repository.findOne.mockResolvedValue({ id: 12, investment: { id: 7 } });
      investmentRepository.findOne.mockResolvedValue(investment({ status: 'CLOSED' }));

      await expect(service.update(12, { notes: 'Changed' }, 42)).rejects.toThrow(
        'Closed investments cannot be modified.',
      );
      expect(repository.update).not.toHaveBeenCalled();
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

    it('returns null when the transaction does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(12, 42)).resolves.toBeNull();
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an ordinary transaction after confirming it is not investment-linked', async () => {
      repository.findOne.mockResolvedValue({ id: 12, investment: null });
      repository.delete.mockResolvedValue(undefined);

      await expect(service.remove(12, 42)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(12, 42);
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
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

    it('records an active plan contribution and advances its due date', async () => {
      const plan = {
        id: 3,
        investmentId: 7,
        status: 'active',
        amount: 75,
        nextDueDate: new Date('2026-11-25T00:00:00.000Z'),
      };
      transaction.investment.findFirst.mockResolvedValue(investment());
      contributionPlansService.findOne.mockResolvedValue(plan);
      transaction.investmentContributionPlan.findFirst.mockResolvedValue(plan);
      repository.create.mockResolvedValue({ id: 22 });
      investmentEventsService.create.mockResolvedValue({ id: 31 });

      await service.recordContribution(contributionInput({ contributionPlanId: '3' }) as never, 42);

      expect(contributionPlansService.findOne).toHaveBeenCalledWith('3', 42);
      expect(transaction.investmentContributionPlan.findFirst).toHaveBeenCalledWith({
        where: { id: 3, investmentId: 7, status: 'active' },
      });
      expect(investmentEventsService.create).toHaveBeenCalledWith(expect.objectContaining({
        recurringPlanId: '3',
        dueDate: '2026-11-25',
        eventType: InvestmentEventType.CONTRIBUTION,
      }), 42, transaction);
      expect(contributionPlansService.advanceNextDueDate).toHaveBeenCalledWith(3, transaction);
    });

    it('uses the active plan when one is discovered for an ad-hoc contribution', async () => {
      const activePlan = { id: 4, investmentId: 7, status: ' ACTIVE ', amount: 75, nextDueDate: null };
      transaction.investment.findFirst.mockResolvedValue(investment());
      contributionPlansService.findAllByInvestment.mockResolvedValue([
        { id: 2, investmentId: 7, status: 'paused' },
        activePlan,
      ]);
      transaction.investmentContributionPlan.findFirst.mockResolvedValue(activePlan);
      repository.create.mockResolvedValue({ id: 22 });
      investmentEventsService.create.mockResolvedValue({ id: 31 });

      await service.recordContribution(contributionInput() as never, 42);

      expect(contributionPlansService.findAllByInvestment).toHaveBeenCalledWith('7', 42);
      expect(investmentEventsService.create).toHaveBeenCalledWith(expect.objectContaining({ recurringPlanId: '4' }), 42, transaction);
      expect(contributionPlansService.advanceNextDueDate).toHaveBeenCalledWith(4, transaction);
    });

    it('records insurance savings contributions as premiums', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment({
        accountingTreatmentOverride: 'INSURANCE_SAVINGS',
      }));
      repository.create.mockResolvedValue({ id: 22 });
      investmentEventsService.create.mockResolvedValue({ id: 31 });

      await service.recordContribution(contributionInput() as never, 42);

      expect(investmentEventsService.create).toHaveBeenCalledWith(expect.objectContaining({
        eventType: InvestmentEventType.PREMIUM,
      }), 42, transaction);
    });

    it.each([
      [null, 'Invalid investmentId 7. Investment does not exist for this user.'],
      [investment({ status: 'CLOSED' }), 'Closed investments cannot be modified.'],
      [investment({ accountId: null }), 'Investment must have a linked funding account before recording a contribution.'],
    ])('rejects a contribution when its investment is unavailable: %j', async (record, message) => {
      transaction.investment.findFirst.mockResolvedValue(record);

      await expect(service.recordContribution(contributionInput() as never, 42)).rejects.toThrow(message);
      expect(repository.create).not.toHaveBeenCalled();
      expect(investmentEventsService.create).not.toHaveBeenCalled();
    });

    it('rejects a contribution when the funding account currency differs from the investment currency', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      transaction.financialAccount.findFirst.mockResolvedValue({ id: 9, currency: 'EUR' });

      await expect(service.recordContribution(contributionInput() as never, 42)).rejects.toThrow(
        'The linked account must belong to you and use the investment currency.',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a contribution that exceeds the available funding balance', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      financialAccountsService.findOne.mockResolvedValue({ currentBalance: 74.99 });

      await expect(service.recordContribution(contributionInput() as never, 42)).rejects.toThrow(
        'Insufficient balance in source account. Available: 74.99, requested: 75.00.',
      );
      expect(repository.create).not.toHaveBeenCalled();
      expect(investmentEventsService.create).not.toHaveBeenCalled();
    });

    it.each([
      [null, 'No contribution plan 3 found for investmentId 7'],
      [{ id: 3, investmentId: 8, status: 'active' }, 'No contribution plan 3 found for investmentId 7'],
      [{ id: 3, investmentId: 7, status: 'paused' }, 'Recurring plan is paused. Resume the plan before recording a contribution.'],
    ])('rejects an unavailable or paused explicit plan: %j', async (plan, message) => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      contributionPlansService.findOne.mockResolvedValue(plan);

      await expect(service.recordContribution(
        contributionInput({ contributionPlanId: '3' }) as never,
        42,
      )).rejects.toThrow(message);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a plan that became inactive before the transaction was recorded', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      contributionPlansService.findOne.mockResolvedValue({ id: 3, investmentId: 7, status: 'active' });
      transaction.investmentContributionPlan.findFirst.mockResolvedValue(null);

      await expect(service.recordContribution(
        contributionInput({ contributionPlanId: '3' }) as never,
        42,
      )).rejects.toThrow('The contribution plan is no longer active. Refresh and try again.');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an amount that differs from the active contribution plan', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      const plan = { id: 3, investmentId: 7, status: 'active', amount: 100 };
      contributionPlansService.findOne.mockResolvedValue(plan);
      transaction.investmentContributionPlan.findFirst.mockResolvedValue(plan);

      await expect(service.recordContribution(
        contributionInput({ contributionPlanId: '3', amount: 75 }) as never,
        42,
      )).rejects.toThrow('Recurring contribution amounts can only be changed from investment edit. Refresh to use the current plan amount.');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects reuse of a request ID for different activity', async () => {
      transaction.investmentEvent.findFirst.mockResolvedValue({
        investmentId: 7,
        recurringPlanId: null,
        linkedTransactionId: 22,
        eventType: InvestmentEventType.CONTRIBUTION,
        eventDate: new Date('2026-10-25T00:00:00.000Z'),
        amount: { toNumber: () => 75 },
      });

      await expect(service.recordContribution(
        contributionInput({ requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7', amount: 80 }) as never,
        42,
      )).rejects.toBeInstanceOf(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a matching replay when its linked transaction is missing', async () => {
      transaction.investmentEvent.findFirst.mockResolvedValue({
        investmentId: 7,
        recurringPlanId: null,
        linkedTransactionId: 22,
        eventType: InvestmentEventType.CONTRIBUTION,
        eventDate: new Date('2026-10-25T00:00:00.000Z'),
        amount: { toNumber: () => 75 },
      });
      transaction.transaction.findFirst.mockResolvedValue(null);

      await expect(service.recordContribution(
        contributionInput({ requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7' }) as never,
        42,
      )).rejects.toThrow('Recorded activity is missing its linked cash transaction.');
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

    it('allows a withdrawal equal to the remaining invested principal', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment({ totalInvested: 50 }));
      repository.create.mockResolvedValue({ id: 23 });

      await expect(service.recordWithdrawal(withdrawalInput({ amount: 50 }) as never, 42)).resolves.toMatchObject({
        message: 'Withdrawal recorded successfully',
      });
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 50 }), 42, transaction);
    });

    it.each([
      [null, 'Invalid investmentId 7. Investment does not exist for this user.'],
      [investment({ status: 'CLOSED' }), 'Closed investments cannot be modified.'],
      [investment({ accountId: null }), 'Investment must have a linked account before recording a withdrawal.'],
    ])('rejects a withdrawal when its investment is unavailable: %j', async (record, message) => {
      transaction.investment.findFirst.mockResolvedValue(record);

      await expect(service.recordWithdrawal(withdrawalInput() as never, 42)).rejects.toThrow(message);
      expect(repository.create).not.toHaveBeenCalled();
      expect(investmentEventsService.create).not.toHaveBeenCalled();
    });

    it('rejects a withdrawal when the linked account has a different currency', async () => {
      transaction.investment.findFirst.mockResolvedValue(investment());
      transaction.financialAccount.findFirst.mockResolvedValue({ id: 9, currency: 'EUR' });

      await expect(service.recordWithdrawal(withdrawalInput() as never, 42)).rejects.toThrow(
        'The linked account must belong to you and use the investment currency.',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('returns the prior withdrawal for a matching request ID without creating duplicates', async () => {
      const priorEvent = {
        id: 31,
        investmentId: 7,
        recurringPlanId: null,
        linkedTransactionId: 23,
        eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL,
        eventDate: new Date('2026-10-25T00:00:00.000Z'),
        amount: { toNumber: () => 50 },
        pricePerUnit: null,
        netAmount: { toNumber: () => 50 },
      };
      const priorTransaction = { id: 23 };
      transaction.investmentEvent.findFirst.mockResolvedValue(priorEvent);
      transaction.transaction.findFirst.mockResolvedValue(priorTransaction);

      await expect(service.recordWithdrawal(
        withdrawalInput({ requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7' }) as never,
        42,
      )).resolves.toMatchObject({
        transaction: priorTransaction,
        investmentEvent: { amount: 50 },
        message: 'Withdrawal recorded successfully',
      });
      expect(repository.create).not.toHaveBeenCalled();
      expect(investmentEventsService.create).not.toHaveBeenCalled();
    });

    it('rejects reuse of a request ID previously used for a contribution', async () => {
      transaction.investmentEvent.findFirst.mockResolvedValue({
        investmentId: 7,
        recurringPlanId: null,
        linkedTransactionId: 22,
        eventType: InvestmentEventType.CONTRIBUTION,
        eventDate: new Date('2026-10-25T00:00:00.000Z'),
        amount: { toNumber: () => 50 },
      });

      await expect(service.recordWithdrawal(
        withdrawalInput({ requestId: '3f66f0d7-4676-4c9f-b1d8-975fccd83ba7' }) as never,
        42,
      )).rejects.toBeInstanceOf(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});