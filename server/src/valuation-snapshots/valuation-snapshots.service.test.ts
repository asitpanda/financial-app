import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { ValuationSnapshotRepository } from './repositories/valuation-snapshot.repository';
import { ValuationSnapshotsService } from './valuation-snapshots.service';

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findAllByInvestment: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const investmentRepository = {
    findById: vi.fn(),
    findOne: vi.fn(),
  };

  return {
    service: new ValuationSnapshotsService(
      repository as unknown as ValuationSnapshotRepository,
      investmentRepository as unknown as InvestmentRepository,
    ),
    repository,
    investmentRepository,
  };
}

describe('ValuationSnapshotsService', () => {
  let service: ValuationSnapshotsService;
  let repository: ReturnType<typeof createService>['repository'];
  let investmentRepository: ReturnType<typeof createService>['investmentRepository'];

  beforeEach(() => {
    ({ service, repository, investmentRepository } = createService());
    investmentRepository.findOne.mockResolvedValue({ id: 12, userId: 42, status: 'active' });
    repository.findOne.mockResolvedValue({ id: 7, investmentId: 12 });
  });

  describe('create', () => {
    it('creates a snapshot under the owned investment user', async () => {
      const input = { investmentId: '12', snapshotDate: '2026-01-01', marketValue: 150 };
      repository.create.mockResolvedValue({ id: 7, ...input, userId: '42' });

      await expect(service.create(input as never, 42)).resolves.toMatchObject({ id: 7, userId: '42' });

      expect(investmentRepository.findOne).toHaveBeenCalledWith(12, 42);
      expect(repository.create).toHaveBeenCalledWith({ ...input, userId: '42' });
    });

    it('rejects creation when the investment is not owned by the user', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ investmentId: '12', snapshotDate: '2026-01-01', marketValue: 150 } as never, 42),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('resolves the investment owner when no user is supplied', async () => {
      const input = { investmentId: '12', snapshotDate: '2026-01-01', marketValue: 150 };
      investmentRepository.findById.mockResolvedValue({ id: 12, userId: 42 });
      repository.create.mockResolvedValue({ id: 7, ...input, userId: '42' });

      await service.create(input as never);

      expect(investmentRepository.findById).toHaveBeenCalledWith(12);
      expect(repository.create).toHaveBeenCalledWith({ ...input, userId: '42' });
    });

    it('rejects creation when the investment does not exist', async () => {
      investmentRepository.findById.mockResolvedValue(null);

      await expect(
        service.create({ investmentId: '12', snapshotDate: '2026-01-01', marketValue: 150 } as never),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects creation for a closed investment', async () => {
      investmentRepository.findOne.mockResolvedValue({ id: 12, userId: 42, status: ' Closed ' });

      await expect(
        service.create({ investmentId: '12', snapshotDate: '2026-01-01', marketValue: 150 } as never, 42),
      ).rejects.toThrow('Closed investments cannot be modified.');

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns snapshots scoped to the requested user', async () => {
      const snapshots = [{ id: 7, userId: 42 }];
      repository.findAll.mockResolvedValue(snapshots);

      await expect(service.findAll(42)).resolves.toBe(snapshots);
      expect(repository.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findAllByInvestment', () => {
    it('checks investment ownership before returning its snapshots', async () => {
      const snapshots = [{ id: 7, investmentId: 12 }];
      repository.findAllByInvestment.mockResolvedValue(snapshots);

      await expect(service.findAllByInvestment('12', 42)).resolves.toBe(snapshots);

      expect(investmentRepository.findOne).toHaveBeenCalledWith(12, 42);
      expect(repository.findAllByInvestment).toHaveBeenCalledWith('12');
    });

    it('does not return snapshots when the investment is not owned by the user', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByInvestment('12', 42)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findAllByInvestment).not.toHaveBeenCalled();
    });

    it('preserves unscoped lookup behavior when no user is supplied', async () => {
      const snapshots = [{ id: 7, investmentId: 12 }];
      repository.findAllByInvestment.mockResolvedValue(snapshots);

      await expect(service.findAllByInvestment('12')).resolves.toBe(snapshots);
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
      expect(repository.findAllByInvestment).toHaveBeenCalledWith('12');
    });
  });

  describe('findOne', () => {
    it('returns a snapshot only when its investment belongs to the user', async () => {
      await expect(service.findOne('7', 42)).resolves.toMatchObject({ id: 7, investmentId: 12 });
      expect(investmentRepository.findOne).toHaveBeenCalledWith(12, 42);
    });

    it('returns null when the snapshot does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('99', 42)).resolves.toBeNull();
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
    });

    it('preserves unscoped lookup behavior when no user is supplied', async () => {
      const snapshot = { id: 7, investmentId: 12 };
      repository.findOne.mockResolvedValue(snapshot);

      await expect(service.findOne('7')).resolves.toBe(snapshot);
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns null without updating a missing snapshot', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('99', { marketValue: 200 } as never, 42)).resolves.toBeNull();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates an owned snapshot when its investment is open', async () => {
      const input = { marketValue: 200 };
      repository.update.mockResolvedValue({ id: 7, ...input });

      await expect(service.update('7', input as never, 42)).resolves.toMatchObject({ id: 7, marketValue: 200 });

      expect(investmentRepository.findOne).toHaveBeenCalledWith(12, 42);
      expect(repository.update).toHaveBeenCalledWith('7', input);
    });

    it('rejects updating a snapshot for a closed investment', async () => {
      investmentRepository.findOne.mockResolvedValue({ id: 12, userId: 42, status: 'closed' });

      await expect(service.update('7', { marketValue: 200 } as never, 42)).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('checks ownership of a replacement investment before updating', async () => {
      const input = { investmentId: '13' };
      investmentRepository.findOne
        .mockResolvedValueOnce({ id: 12, userId: 42, status: 'active' })
        .mockResolvedValueOnce({ id: 12, userId: 42, status: 'active' })
        .mockResolvedValueOnce(null);

      await expect(service.update('7', input as never, 42)).rejects.toBeInstanceOf(NotFoundException);
      expect(investmentRepository.findOne).toHaveBeenNthCalledWith(3, 13, 42);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('preserves unscoped update behavior when no user is supplied', async () => {
      const input = { marketValue: 200 };
      const updated = { id: 7, ...input };
      repository.update.mockResolvedValue(updated);

      await expect(service.update('7', input as never)).resolves.toBe(updated);

      expect(investmentRepository.findOne).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith('7', input);
    });
  });

  describe('remove', () => {
    it('does nothing when the snapshot does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('99', 42)).resolves.toBeUndefined();
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('rejects removing a snapshot for a closed investment', async () => {
      investmentRepository.findOne.mockResolvedValue({ id: 12, userId: 42, status: 'closed' });

      await expect(service.remove('7', 42)).rejects.toThrow('Closed investments cannot be modified.');
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an owned snapshot for an open investment', async () => {
      await expect(service.remove('7', 42)).resolves.toBeUndefined();

      expect(investmentRepository.findOne).toHaveBeenCalledWith(12, 42);
      expect(repository.delete).toHaveBeenCalledWith('7');
    });

    it('preserves unscoped deletion behavior when no user is supplied', async () => {
      await service.remove('7');

      expect(investmentRepository.findOne).not.toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalledWith('7');
    });
  });
});