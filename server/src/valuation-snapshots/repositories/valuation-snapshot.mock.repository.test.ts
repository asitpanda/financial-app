import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ValuationSnapshotMockRepository } from './valuation-snapshot.mock.repository';

describe('ValuationSnapshotMockRepository', () => {
  let repository: ValuationSnapshotMockRepository;
  let investmentRepository: {
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.resetModules();
    const { ValuationSnapshotMockRepository: Repository } = await import('./valuation-snapshot.mock.repository');
    investmentRepository = {
      findById: vi.fn().mockResolvedValue({ id: 9201, userId: 42, status: 'active', totalInvested: 50 }),
      update: vi.fn(),
    };
    repository = new Repository(investmentRepository as never);
  });

  describe('findAll', () => {
    it('returns only snapshots belonging to the requested user', async () => {
      const created = await repository.create({
        userId: '9201',
        investmentId: '9201',
        snapshotDate: '2026-01-01T00:00:00.000Z',
        marketValue: 120,
      } as never);

      await expect(repository.findAll(9201)).resolves.toEqual([created]);
    });
  });

  describe('create', () => {
    it('starts IDs at one when the mock snapshot store is empty', async () => {
      vi.doMock('../../mockdata', () => ({ mockValuationSnapshotsData: [] }));
      vi.resetModules();

      try {
        const { ValuationSnapshotMockRepository: EmptyStoreRepository } = await import('./valuation-snapshot.mock.repository');
        const emptyStoreRepository = new EmptyStoreRepository(investmentRepository as never);
        const snapshot = await emptyStoreRepository.create({
          userId: '42',
          investmentId: '9201',
          snapshotDate: '2026-02-01T00:00:00.000Z',
          marketValue: 120,
        } as never);

        expect(snapshot.id).toBe(1);
      } finally {
        vi.doUnmock('../../mockdata');
        vi.resetModules();
      }
    });

    it('normalizes stored values and syncs the investment from the latest snapshot', async () => {
      const snapshotDate = '2026-02-01T00:00:00.000Z';

      await expect(repository.create({
        userId: '42',
        investmentId: '9201',
        snapshotDate,
        marketValue: 120,
        units: '1.5',
        price: '',
      } as never)).resolves.toMatchObject({
        userId: 42,
        investmentId: 9201,
        snapshotDate: new Date(snapshotDate),
        marketValue: 120,
        units: 1.5,
        price: null,
        source: null,
      });

      expect(investmentRepository.update).toHaveBeenCalledWith(9201, {
        currentValue: 120,
        currentValueSource: 'valuation_snapshot',
        lastValuationAt: new Date(snapshotDate).toISOString(),
      }, 42);
    });

    it('does not rewrite the current value of a closed investment', async () => {
      investmentRepository.findById.mockResolvedValue({
        id: 9201,
        userId: 42,
        status: 'CLOSED',
        totalInvested: 50,
      });

      await repository.create({
        userId: '42',
        investmentId: '9201',
        snapshotDate: '2026-02-01T00:00:00.000Z',
        marketValue: 120,
      } as never);

      expect(investmentRepository.update).not.toHaveBeenCalled();
    });

    it('does not synchronize when the investment no longer exists', async () => {
      investmentRepository.findById.mockResolvedValue(null);

      await repository.create({
        userId: '42',
        investmentId: '9201',
        snapshotDate: '2026-02-01T00:00:00.000Z',
        marketValue: 120,
      } as never);

      expect(investmentRepository.update).not.toHaveBeenCalled();
    });

    it('uses the higher snapshot ID to break equal-date latest-valuation ties', async () => {
      await repository.create({
        userId: '42',
        investmentId: '9207',
        snapshotDate: '2026-04-01T00:00:00.000Z',
        marketValue: 100,
      } as never);
      investmentRepository.update.mockClear();

      await repository.create({
        userId: '42',
        investmentId: '9207',
        snapshotDate: '2026-04-01T00:00:00.000Z',
        marketValue: 200,
      } as never);

      expect(investmentRepository.update).toHaveBeenCalledWith(9207, expect.objectContaining({
        currentValue: 200,
        currentValueSource: 'valuation_snapshot',
      }), 42);
    });
  });

  describe('findAllByInvestment', () => {
    it('returns snapshots for the numeric investment identifier', async () => {
      const created = await repository.create({
        userId: '42',
        investmentId: '9202',
        snapshotDate: '2026-01-01T00:00:00.000Z',
        marketValue: 200,
      } as never);

      await expect(repository.findAllByInvestment('9202')).resolves.toEqual([created]);
    });
  });

  describe('findOne', () => {
    it('returns the snapshot matching its numeric identifier', async () => {
      const created = await repository.create({
        userId: '42',
        investmentId: '9203',
        snapshotDate: '2026-01-01T00:00:00.000Z',
        marketValue: 300,
      } as never);

      await expect(repository.findOne(String(created.id))).resolves.toBe(created);
    });
  });

  describe('update', () => {
    it('normalizes changed fields and synchronizes both investments when reassigned', async () => {
      const original = await repository.create({
        userId: '42',
        investmentId: '9204',
        snapshotDate: '2026-01-01T00:00:00.000Z',
        marketValue: 100,
      } as never);
      investmentRepository.update.mockClear();

      await expect(repository.update(String(original.id), {
        investmentId: '9205',
        snapshotDate: '2026-03-01T00:00:00.000Z',
        units: '2.5',
        userId: '43',
        price: '12.5',
        source: 'MANUAL',
      } as never)).resolves.toMatchObject({
        investmentId: 9205,
        userId: 43,
        snapshotDate: new Date('2026-03-01T00:00:00.000Z'),
        units: 2.5,
        price: 12.5,
        source: 'MANUAL',
      });

      expect(investmentRepository.update).toHaveBeenCalledTimes(2);
      expect(investmentRepository.update).toHaveBeenNthCalledWith(1, 9204, {
        currentValue: 50,
        currentValueSource: 'manual',
        lastValuationAt: null,
      }, 42);
      expect(investmentRepository.update).toHaveBeenNthCalledWith(2, 9205, {
        currentValue: 100,
        currentValueSource: 'valuation_snapshot',
        lastValuationAt: new Date('2026-03-01T00:00:00.000Z').toISOString(),
      }, 42);
    });

    it('preserves omitted optional fields and synchronizes once when the investment is unchanged', async () => {
      const original = await repository.create({
        userId: '42',
        investmentId: '9208',
        snapshotDate: '2026-01-01T00:00:00.000Z',
        marketValue: 100,
        units: 2,
        price: 50,
        source: 'MANUAL',
      } as never);
      investmentRepository.update.mockClear();

      await expect(repository.update(String(original.id), { marketValue: 150 })).resolves.toMatchObject({
        userId: 42,
        investmentId: 9208,
        snapshotDate: original.snapshotDate,
        marketValue: 150,
        units: 2,
        price: 50,
        source: 'MANUAL',
      });
      expect(investmentRepository.update).toHaveBeenCalledTimes(1);
      expect(investmentRepository.update).toHaveBeenCalledWith(9208, expect.objectContaining({
        currentValue: 150,
      }), 42);
    });

    it('returns null without synchronizing when the snapshot does not exist', async () => {
      await expect(repository.update('999999', { marketValue: 1 })).resolves.toBeNull();
      expect(investmentRepository.findById).not.toHaveBeenCalled();
      expect(investmentRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('removes the snapshot and restores the previous latest valuation', async () => {
      await repository.create({
        userId: '42',
        investmentId: '9206',
        snapshotDate: '2026-01-01T00:00:00.000Z',
        marketValue: 100,
      } as never);
      const latest = await repository.create({
        userId: '42',
        investmentId: '9206',
        snapshotDate: '2026-02-01T00:00:00.000Z',
        marketValue: 150,
      } as never);
      investmentRepository.update.mockClear();

      await repository.delete(String(latest.id));

      await expect(repository.findOne(String(latest.id))).resolves.toBeUndefined();
      expect(investmentRepository.update).toHaveBeenCalledWith(9206, {
        currentValue: 100,
        currentValueSource: 'valuation_snapshot',
        lastValuationAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      }, 42);
    });

    it('does not synchronize an investment when the snapshot is missing', async () => {
      await repository.delete('999999');

      expect(investmentRepository.findById).not.toHaveBeenCalled();
      expect(investmentRepository.update).not.toHaveBeenCalled();
    });
  });
});