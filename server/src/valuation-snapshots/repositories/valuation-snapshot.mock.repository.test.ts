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
      } as never)).resolves.toMatchObject({
        investmentId: 9205,
        snapshotDate: new Date('2026-03-01T00:00:00.000Z'),
        units: 2.5,
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