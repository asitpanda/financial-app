import { InvestmentEventType, Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { syncInvestmentDerivedValues } from './investment-valuation';

function createTransaction(investment: Record<string, unknown> | null = {}) {
  const transaction = {
    investment: { findUnique: vi.fn().mockResolvedValue(investment), update: vi.fn() },
    investmentEvent: {
      aggregate: vi.fn()
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('1000') } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('200') } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('50') } }),
      findFirst: vi.fn().mockResolvedValue({ eventDate: new Date('2026-03-01T00:00:00.000Z') }),
    },
    valuationSnapshot: {
      findFirst: vi.fn().mockResolvedValue({
        marketValue: new Prisma.Decimal('1200'),
        snapshotDate: new Date('2026-04-01T00:00:00.000Z'),
      }),
    },
  };

  return transaction;
}

describe('syncInvestmentDerivedValues', () => {
  it('derives invested principal and uses the latest observed valuation', async () => {
    const transaction = createTransaction({
      status: 'active',
      accountingTreatmentOverride: null,
      assetCategoryRef: { accountingTreatment: null },
      assetTypeRef: { accountingTreatment: null },
      totalInvested: new Prisma.Decimal('300'),
    });

    await syncInvestmentDerivedValues(transaction as never, 7);

    expect(transaction.investmentEvent.aggregate).toHaveBeenNthCalledWith(1, {
      where: {
        investmentId: 7,
        status: 'CONFIRMED',
        eventType: { in: [InvestmentEventType.CONTRIBUTION, InvestmentEventType.OPENING_BALANCE] },
      },
      _sum: { amount: true },
    });
    expect(transaction.investment.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        totalInvested: 800,
        currentValue: new Prisma.Decimal('1200'),
        currentValueSource: 'valuation_snapshot',
        lastValuationAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    });
  });

  it('includes insurance premiums in principal without manufacturing a current value', async () => {
    const transaction = createTransaction({
      status: 'active',
      accountingTreatmentOverride: null,
      assetCategoryRef: { accountingTreatment: 'INSURANCE_SAVINGS' },
      assetTypeRef: { accountingTreatment: null },
    });
    transaction.valuationSnapshot.findFirst.mockResolvedValue(null);

    await syncInvestmentDerivedValues(transaction as never, 7);

    expect(transaction.investmentEvent.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: {
            in: [
              InvestmentEventType.CONTRIBUTION,
              InvestmentEventType.OPENING_BALANCE,
              InvestmentEventType.PREMIUM,
            ],
          },
        }),
      }),
    );
    expect(transaction.investment.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ totalInvested: 1000, currentValue: 0 }),
    });
  });

  it('zeros both balances for protection expenses', async () => {
    const transaction = createTransaction({
      status: 'active',
      accountingTreatmentOverride: 'PROTECTION_EXPENSE',
      assetCategoryRef: { accountingTreatment: null },
      assetTypeRef: { accountingTreatment: null },
    });

    await syncInvestmentDerivedValues(transaction as never, 7);

    expect(transaction.investment.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ totalInvested: 0, currentValue: 0, currentValueSource: 'manual' }),
    });
  });

  it.each([
    { label: 'does nothing when the investment is missing', investment: null },
    { label: 'does nothing when the investment is closed', investment: { status: 'CLOSED' } },
  ])('$label', async ({ investment }) => {
    const transaction = createTransaction(investment as Record<string, unknown> | null);

    await syncInvestmentDerivedValues(transaction as never, 7);

    expect(transaction.investmentEvent.aggregate).not.toHaveBeenCalled();
    expect(transaction.investment.update).not.toHaveBeenCalled();
  });

  it('preserves the stored principal when no event exists and the ledger was not changed', async () => {
    const transaction = createTransaction({
      status: 'active',
      accountingTreatmentOverride: null,
      assetCategoryRef: { accountingTreatment: null },
      assetTypeRef: { accountingTreatment: null },
      totalInvested: new Prisma.Decimal('300'),
    });
    transaction.investmentEvent.aggregate
      .mockReset()
      .mockResolvedValue({ _sum: { amount: null } });
    transaction.investmentEvent.findFirst.mockResolvedValue(null);
    transaction.valuationSnapshot.findFirst.mockResolvedValue(null);

    await syncInvestmentDerivedValues(transaction as never, 7, false);

    expect(transaction.investment.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        totalInvested: 300,
        currentValue: 300,
        currentValueSource: null,
        lastValuationAt: null,
      }),
    });
  });
});