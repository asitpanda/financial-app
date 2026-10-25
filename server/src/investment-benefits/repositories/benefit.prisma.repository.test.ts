import { InvestmentBenefitStatus, InvestmentBenefitType, InvestmentEventType, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { BenefitPrismaRepository } from './benefit.prisma.repository';

function createRepository() {
  const prisma = {
    investmentBenefit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    investmentEvent: { findMany: vi.fn(), create: vi.fn() },
    investment: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    investmentContributionPlan: { updateMany: vi.fn() },
    valuationSnapshot: { findFirst: vi.fn() },
    transaction: { create: vi.fn() },
    $transaction: vi.fn(),
  };

  return {
    repository: new BenefitPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

function benefitRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    investmentId: 5,
    benefitType: InvestmentBenefitType.COUPON,
    amount: new Prisma.Decimal(100),
    benefitDate: new Date('2026-10-25T00:00:00.000Z'),
    status: InvestmentBenefitStatus.EXPECTED,
    destinationAccountId: null,
    notes: null,
    createdAt: new Date('2026-10-25T00:00:00.000Z'),
    updatedAt: new Date('2026-10-25T00:00:00.000Z'),
    ...overrides,
  };
}

describe('BenefitPrismaRepository', () => {
  let repository: BenefitPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
  });

  describe('create', () => {
    it('converts the amount and parses the benefit date before persistence', async () => {
      const data = {
        benefitType: InvestmentBenefitType.COUPON,
        amount: 100.5,
        benefitDate: '2026-10-25T00:00:00.000Z',
      };
      prisma.investmentBenefit.create.mockResolvedValue(benefitRow({ amount: new Prisma.Decimal(100.5) }));

      await expect(repository.create('5', data as never)).resolves.toMatchObject({ amount: 100.5 });
      expect(prisma.investmentBenefit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investmentId: 5,
          amount: new Prisma.Decimal(100.5),
          benefitDate: new Date(data.benefitDate),
          destinationAccountId: null,
        }),
      });
    });
  });

  describe('findAll', () => {
    it("filters by investment owner and orders benefits by date and ID", async () => {
      prisma.investmentBenefit.findMany.mockResolvedValue([benefitRow()]);

      await expect(repository.findAll(42)).resolves.toMatchObject([{ amount: 100 }]);
      expect(prisma.investmentBenefit.findMany).toHaveBeenCalledWith({
        where: { investment: { userId: 42 } },
        orderBy: [{ benefitDate: 'asc' }, { id: 'asc' }],
      });
    });
  });

  describe('findAllByInvestment', () => {
    it('filters by investment ID and maps decimal amounts', async () => {
      prisma.investmentBenefit.findMany.mockResolvedValue([benefitRow()]);

      await expect(repository.findAllByInvestment('5')).resolves.toMatchObject([{ amount: 100 }]);
      expect(prisma.investmentBenefit.findMany).toHaveBeenCalledWith({
        where: { investmentId: 5 },
        orderBy: [{ benefitDate: 'asc' }, { id: 'asc' }],
      });
    });
  });

  describe('findAllByInvestmentWithDetails', () => {
    it('groups mapped realization events under their benefits', async () => {
      const firstBenefit = benefitRow();
      const secondBenefit = benefitRow({ id: 102 });
      prisma.investmentBenefit.findMany.mockResolvedValue([firstBenefit, secondBenefit]);
      prisma.investmentEvent.findMany.mockResolvedValue([
        { id: 201, linkedBenefitId: 101, amount: new Prisma.Decimal(100), units: null, pricePerUnit: null, netAmount: null },
      ]);

      const results = await repository.findAllByInvestmentWithDetails('5');

      expect(prisma.investmentEvent.findMany).toHaveBeenCalledWith({
        where: { investmentId: 5, linkedBenefitId: { in: [101, 102] } },
        orderBy: { eventDate: 'asc' },
      });
      expect(results[0]).toMatchObject({ amount: 100, realizedEvents: [{ id: 201, amount: 100 }] });
      expect(results[1].realizedEvents).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns null when the benefit does not exist', async () => {
      prisma.investmentBenefit.findUnique.mockResolvedValue(null);

      await expect(repository.findOne('101')).resolves.toBeNull();
      expect(prisma.investmentBenefit.findUnique).toHaveBeenCalledWith({ where: { id: 101 } });
    });
  });

  describe('findOneWithDetails', () => {
    it('returns a benefit with its events ordered and converted from decimals', async () => {
      prisma.investmentBenefit.findUnique.mockResolvedValue(benefitRow());
      prisma.investmentEvent.findMany.mockResolvedValue([
        { id: 201, amount: new Prisma.Decimal(100), units: null, pricePerUnit: null, netAmount: null },
      ]);

      await expect(repository.findOneWithDetails('101')).resolves.toMatchObject({
        amount: 100,
        realizedEvents: [{ id: 201, amount: 100 }],
      });
      expect(prisma.investmentEvent.findMany).toHaveBeenCalledWith({
        where: { linkedBenefitId: 101 },
        orderBy: { eventDate: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('maps decimal values and parses an updated date', async () => {
      const date = '2027-01-01T00:00:00.000Z';
      prisma.investmentBenefit.update.mockResolvedValue(
        benefitRow({ amount: new Prisma.Decimal(125), benefitDate: new Date(date) }),
      );

      await expect(repository.update('101', { amount: 125, benefitDate: date })).resolves.toMatchObject({
        amount: 125,
        benefitDate: new Date(date),
      });
      expect(prisma.investmentBenefit.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: expect.objectContaining({ amount: new Prisma.Decimal(125), benefitDate: new Date(date) }),
      });
    });
  });

  describe('delete', () => {
    it('deletes the benefit by its numeric ID', async () => {
      await expect(repository.delete('101')).resolves.toBeUndefined();

      expect(prisma.investmentBenefit.delete).toHaveBeenCalledWith({ where: { id: 101 } });
    });
  });

  describe('realize', () => {
    it('creates realization events and updates the benefit in a serializable transaction', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentBenefit.findFirst.mockResolvedValue({
        ...benefitRow(),
        investment: { accountId: 12, status: 'active' },
      });
      prisma.investmentEvent.create.mockResolvedValue({
        id: 201,
        investmentId: 5,
        linkedBenefitId: 101,
        eventType: InvestmentEventType.BENEFIT_RECEIPT,
        amount: new Prisma.Decimal(100),
      });
      prisma.investmentBenefit.update.mockResolvedValue(
        benefitRow({ status: InvestmentBenefitStatus.RECEIVED }),
      );
      const data = {
        components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 100 }],
        closesInvestment: true,
      };

      await expect(repository.realize('101', '5', 42, data)).resolves.toMatchObject({
        benefit: { id: 101, status: InvestmentBenefitStatus.RECEIVED },
        events: [{ id: 201, amount: 100 }],
      });
      expect(prisma.investmentBenefit.findFirst).toHaveBeenCalledWith({
        where: { id: 101, investmentId: 5, investment: { userId: 42 } },
        include: { investment: { select: { accountId: true, status: true } } },
      });
      expect(prisma.investmentBenefit.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: expect.objectContaining({ status: InvestmentBenefitStatus.RECEIVED }),
      });
      expect(prisma.investment.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: expect.objectContaining({ status: 'closed', currentValue: 0 }),
      });
      expect(prisma.investmentContributionPlan.updateMany).toHaveBeenCalledWith({
        where: { investmentId: 5, status: 'active' },
        data: { status: 'paused' },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });

    it('rejects when the benefit is outside the requested user and investment', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investmentBenefit.findFirst.mockResolvedValue(null);

      await expect(
        repository.realize('101', '5', 42, {
          components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 100 }],
        }),
      ).rejects.toThrow('Investment benefit not found');
      expect(prisma.investmentEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('quickRealize', () => {
    it('creates and realizes a benefit in one serializable transaction', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) =>
        callback(prisma),
      );
      prisma.investment.findFirst.mockResolvedValue({ id: 5, userId: 42, status: 'active', accountId: 12 });
      prisma.investmentBenefit.create.mockResolvedValue(benefitRow());
      prisma.investmentEvent.create.mockResolvedValue({
        id: 201,
        investmentId: 5,
        linkedBenefitId: 101,
        eventType: InvestmentEventType.BENEFIT_RECEIPT,
        amount: new Prisma.Decimal(100),
      });
      prisma.investmentBenefit.update.mockResolvedValue(
        benefitRow({ status: InvestmentBenefitStatus.RECEIVED }),
      );

      await expect(
        repository.quickRealize('5', 42, {
          benefitType: InvestmentBenefitType.COUPON,
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 100,
        } as never),
      ).resolves.toMatchObject({
        benefit: { status: InvestmentBenefitStatus.RECEIVED },
        events: [{ amount: 100 }],
      });
      expect(prisma.investment.findFirst).toHaveBeenCalledWith({ where: { id: 5, userId: 42 } });
      expect(prisma.investmentBenefit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          investmentId: 5,
          benefitType: InvestmentBenefitType.COUPON,
          amount: new Prisma.Decimal(100),
          status: InvestmentBenefitStatus.EXPECTED,
        }),
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'Serializable',
      });
    });
  });
});