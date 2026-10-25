import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventRepository } from './event.repository';

describe('EventRepository', () => {
  let repository: EventRepository;
  let dataSource: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findAllByInvestment: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dataSource = {
      create: vi.fn(),
      findAll: vi.fn(),
      findAllByInvestment: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    repository = new EventRepository(dataSource as never);
  });

  describe('create', () => {
    it('forwards event data and the optional transaction to the data source', async () => {
      const data = { investmentId: '7', amount: 20 };
      const transaction = {};

      await repository.create(data as never, transaction as never);

      expect(dataSource.create).toHaveBeenCalledWith(data, transaction);
    });
  });

  describe('findAll', () => {
    it('forwards the user ID to the data source', async () => {
      await repository.findAll(42);

      expect(dataSource.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findAllByInvestment', () => {
    it('forwards the investment ID to the data source', async () => {
      await repository.findAllByInvestment('7');

      expect(dataSource.findAllByInvestment).toHaveBeenCalledWith('7');
    });
  });

  describe('findOne', () => {
    it('forwards the event ID to the data source', async () => {
      await repository.findOne('3');

      expect(dataSource.findOne).toHaveBeenCalledWith('3');
    });
  });

  describe('update', () => {
    it('forwards the event ID and changes to the data source', async () => {
      const data = { notes: 'Updated' };

      await repository.update('3', data as never);

      expect(dataSource.update).toHaveBeenCalledWith('3', data);
    });
  });

  describe('delete', () => {
    it('forwards the event ID to the data source', async () => {
      await repository.delete('3');

      expect(dataSource.delete).toHaveBeenCalledWith('3');
    });
  });
});