import { InvestmentEventType, type Prisma } from '@prisma/client';

export async function syncInvestmentDerivedValues(
  transaction: Prisma.TransactionClient,
  investmentId: number,
  ledgerChanged = true,
) {
  const investment = await transaction.investment.findUnique({
    where: { id: investmentId },
    include: { assetTypeRef: true, assetCategoryRef: true },
  });
  if (!investment || investment.status.toLowerCase() === 'closed') return;

  const treatment = investment.accountingTreatmentOverride
    ?? investment.assetCategoryRef?.accountingTreatment
    ?? investment.assetTypeRef?.accountingTreatment
    ?? 'INVESTMENT';
  const [contributions, withdrawals, income, latestEvent, latestSnapshot] = await Promise.all([
    transaction.investmentEvent.aggregate({
      where: {
        investmentId,
        status: 'CONFIRMED',
        eventType: { in: treatment === 'INSURANCE_SAVINGS'
          ? [InvestmentEventType.CONTRIBUTION, InvestmentEventType.OPENING_BALANCE, InvestmentEventType.PREMIUM]
          : [InvestmentEventType.CONTRIBUTION, InvestmentEventType.OPENING_BALANCE] },
      },
      _sum: { amount: true },
    }),
    transaction.investmentEvent.aggregate({
      where: { investmentId, status: 'CONFIRMED', eventType: 'WITHDRAWAL_PRINCIPAL' },
      _sum: { amount: true },
    }),
    transaction.investmentEvent.aggregate({
      where: { investmentId, status: 'CONFIRMED', eventType: { in: ['INCOME_CREDIT', 'OPENING_INCOME_CREDIT'] } },
      _sum: { amount: true },
    }),
    transaction.investmentEvent.findFirst({
      where: { investmentId, status: 'CONFIRMED' },
      orderBy: [{ eventDate: 'desc' }, { id: 'desc' }],
    }),
    transaction.valuationSnapshot.findFirst({
      where: { investmentId },
      orderBy: [{ snapshotDate: 'desc' }, { id: 'desc' }],
    }),
  ]);

  const principalIn = contributions._sum.amount?.toNumber() ?? 0;
  const principalOut = withdrawals._sum.amount?.toNumber() ?? 0;
  const incomeAmount = income._sum.amount?.toNumber() ?? 0;
  const totalInvested = treatment === 'PROTECTION_EXPENSE' ? 0
    : !latestEvent && !ledgerChanged ? Number(investment.totalInvested ?? 0)
    : treatment === 'INSURANCE_SAVINGS' ? principalIn : principalIn - principalOut;
  const fallbackValue = treatment === 'INVESTMENT' ? totalInvested + incomeAmount : 0;

  await transaction.investment.update({
    where: { id: investmentId },
    data: {
      totalInvested,
      currentValue: treatment === 'PROTECTION_EXPENSE' ? 0 : latestSnapshot?.marketValue ?? fallbackValue,
      currentValueSource: latestSnapshot && treatment !== 'PROTECTION_EXPENSE'
        ? 'valuation_snapshot' : latestEvent ? 'manual' : null,
      lastValuationAt: latestSnapshot?.snapshotDate ?? latestEvent?.eventDate ?? null,
    },
  });
}