import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { syncInvestmentDerivedValues } from '../../investments/repositories/investment-valuation';
import { ValuationSnapshotPrismaRepository } from './valuation-snapshot.prisma.repository';

vi.mock('../../investments/repositories/investment-valuation', () => ({
  syncInvestmentDerivedValues: vi.fn(),
}));

function createRepository() {
  const prisma = {
    valuationSnapshot: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    repository: new ValuationSnapshotPrismaRepository(prisma as unknown as PrismaService),
    prisma,
  };
}

function snapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    userId: 42,
    investmentId: 12,
    snapshotDate: new Date('2026-01-01T00:00:00.000Z'),
    marketValue: 150,
    units: null,
    price: null,
    source: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ValuationSnapshotPrismaRepository', () => {
  let repository: ValuationSnapshotPrismaRepository;
  let prisma: ReturnType<typeof createRepository>['prisma'];

  beforeEach(() => {
    ({ repository, prisma } = createRepository());
    vi.mocked(syncInvestmentDerivedValues).mockClear();
  });

  describe('findAll', () => {
    it('filters by user and orders snapshots newest first with a stable ID tie-breaker', async () => {
      prisma.valuationSnapshot.findMany.mockResolvedValue([snapshotRow()]);

      await expect(repository.findAll(42)).resolves.toEqual([snapshotRow()]);
      expect(prisma.valuationSnapshot.findMany).toHaveBeenCalledWith({
        where: { userId: 42 },
        orderBy: [{ snapshotDate: 'desc' }, { id: 'desc' }],
      });
    });
  });

  describe('create', () => {
    it('normalizes persisted fields and synchronizes derived values in a serializable transaction', async () => {
      const snapshotDate = '2026-02-01T00:00:00.000Z';
      const input = {
        userId: '42',
        investmentId: '12',
        snapshotDate,
        marketValue: 150,
        units: 1.5,
        price: 100,
      };
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => {
        prisma.valuationSnapshot.create.mockResolvedValue(snapshotRow({ snapshotDate: new Date(snapshotDate) }));
        return callback(prisma);
      });

      await expect(repository.create(input as never)).resolves.toMatchObject({ investmentId: 12, marketValue: 150 });

      expect(prisma.valuationSnapshot.create).toHaveBeenCalledWith({
        data: { ...input, userId: 42, investmentId: 12, snapshotDate: new Date(snapshotDate), units: 1.5, price: 100 },
      });
      expect(syncInvestmentDerivedValues).toHaveBeenCalledWith(prisma, 12, false);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    });
  });

  describe('findAllByInvestment', () => {
    it('converts the investment identifier and orders by snapshot date', async () => {
      prisma.valuationSnapshot.findMany.mockResolvedValue([snapshotRow()]);

      await expect(repository.findAllByInvestment('12')).resolves.toEqual([snapshotRow()]);
      expect(prisma.valuationSnapshot.findMany).toHaveBeenCalledWith({
        where: { investmentId: 12 },
        orderBy: { snapshotDate: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('converts the snapshot identifier and returns a missing result', async () => {
      prisma.valuationSnapshot.findUnique.mockResolvedValue(null);

      await expect(repository.findOne('7')).resolves.toBeNull();
      expect(prisma.valuationSnapshot.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });

  describe('update', () => {
    it('normalizes changed values and synchronizes both investments in one transaction', async () => {
      const snapshotDate = '2026-03-01T00:00:00.000Z';
      const input = { investmentId: '13', snapshotDate, units: '2.5', price: '' };
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => {
        prisma.valuationSnapshot.findUnique.mockResolvedValue(snapshotRow());
        prisma.valuationSnapshot.update.mockResolvedValue(snapshotRow({
          investmentId: 13,
          snapshotDate: new Date(snapshotDate),
          units: 2.5,
          price: null,
        }));
        return callback(prisma);
      });

      await expect(repository.update('7', input as never)).resolves.toMatchObject({ investmentId: 13, units: 2.5 });

      expect(prisma.valuationSnapshot.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { ...input, investmentId: 13, snapshotDate: new Date(snapshotDate), units: 2.5, price: null, userId: undefined },
      });
      expect(syncInvestmentDerivedValues).toHaveBeenNthCalledWith(1, prisma, 12, false);
      expect(syncInvestmentDerivedValues).toHaveBeenNthCalledWith(2, prisma, 13, false);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    });

    it('returns null without updating or synchronizing when the snapshot is missing', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => {
        prisma.valuationSnapshot.findUnique.mockResolvedValue(null);
        return callback(prisma);
      });

      await expect(repository.update('7', { marketValue: 200 })).resolves.toBeNull();

      expect(prisma.valuationSnapshot.update).not.toHaveBeenCalled();
      expect(syncInvestmentDerivedValues).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the snapshot and synchronizes its investment in a serializable transaction', async () => {
      prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => Promise<unknown>) => {
        prisma.valuationSnapshot.delete.mockResolvedValue(snapshotRow());
        return callback(prisma);
      });

      await expect(repository.delete('7')).resolves.toBeUndefined();

      expect(prisma.valuationSnapshot.delete).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(syncInvestmentDerivedValues).toHaveBeenCalledWith(prisma, 12, false);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    });
  });
});