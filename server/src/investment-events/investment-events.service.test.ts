import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvestmentEventStatus, InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvestmentRepository } from '../investments/repositories/investment.repository';
import { InvestmentEventRecord } from './investment-event.types';
import { InvestmentEventsService } from './investment-events.service';
import { EventRepository } from './repositories/event.repository';

function createService() {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findAllByInvestment: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const investmentRepository = { findOne: vi.fn() };

  return {
    service: new InvestmentEventsService(
      repository as unknown as EventRepository,
      investmentRepository as unknown as InvestmentRepository,
    ),
    repository,
    investmentRepository,
  };
}

function event(overrides: Partial<InvestmentEventRecord> = {}): InvestmentEventRecord {
  return {
    id: 3,
    investmentId: 7,
    recurringPlanId: null,
    linkedTransactionId: null,
    linkedBenefitId: null,
    eventType: InvestmentEventType.CONTRIBUTION,
    dueDate: null,
    status: InvestmentEventStatus.CONFIRMED,
    eventSource: 'MANUAL',
    sequenceNumber: null,
    eventDate: new Date('2026-10-25T00:00:00.000Z'),
    amount: 100,
    units: null,
    pricePerUnit: null,
    netAmount: null,
    notes: null,
    meta: null,
    createdAt: new Date('2026-10-25T00:00:00.000Z'),
    updatedAt: new Date('2026-10-25T00:00:00.000Z'),
    ...overrides,
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    investmentId: '7',
    eventType: InvestmentEventType.CONTRIBUTION,
    eventDate: '2026-10-25T00:00:00.000Z',
    ...overrides,
  };
}

describe('InvestmentEventsService', () => {
  let service: InvestmentEventsService;
  let repository: ReturnType<typeof createService>['repository'];
  let investmentRepository: ReturnType<typeof createService>['investmentRepository'];

  beforeEach(() => {
    ({ service, repository, investmentRepository } = createService());
    investmentRepository.findOne.mockResolvedValue({ status: 'active' });
  });

  describe('create', () => {
    it('creates an event for an owned open investment', async () => {
      const data = createInput();
      const savedEvent = event();
      repository.create.mockResolvedValue(savedEvent);

      await expect(service.create(data as never, 42)).resolves.toBe(savedEvent);
      expect(investmentRepository.findOne).toHaveBeenCalledWith(7, 42);
      expect(repository.create).toHaveBeenCalledWith(data, undefined);
    });

    it('rejects an event when the investment is not owned by the user', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createInput() as never, 42)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects changes to a closed investment regardless of status casing or whitespace', async () => {
      investmentRepository.findOne.mockResolvedValue({ status: ' Closed ' });

      await expect(service.create(createInput() as never, 42)).rejects.toThrow(
        'Closed investments cannot be modified.',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it.each(['linkedTransactionId', 'linkedBenefitId'] as const)(
      'requires linked activity through its financial command when %s is supplied without a transaction',
      async (field) => {
        await expect(
          service.create(createInput({ [field]: '12' }) as never, 42),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('allows linked activity when it is part of a financial transaction', async () => {
      const data = createInput({ linkedTransactionId: '12' });
      const transaction = {};
      repository.create.mockResolvedValue(event({ linkedTransactionId: 12 }));

      await expect(service.create(data as never, 42, transaction as never)).resolves.toMatchObject({
        linkedTransactionId: 12,
      });
      expect(repository.create).toHaveBeenCalledWith(data, transaction);
    });

    it('rejects an income credit linked to a financial transaction', async () => {
      const data = createInput({
        eventType: InvestmentEventType.INCOME_CREDIT,
        status: InvestmentEventStatus.CONFIRMED,
        linkedTransactionId: '12',
      });

      await expect(service.create(data as never)).rejects.toThrow(
        'Income credit cannot be linked to a transaction.',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('requires income credits to be confirmed', async () => {
      const data = createInput({
        eventType: InvestmentEventType.INCOME_CREDIT,
        status: InvestmentEventStatus.PENDING,
      });

      await expect(service.create(data as never)).rejects.toThrow(
        'Income credit must be recorded as a confirmed event.',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns the events for the current user', async () => {
      const events = [event()];
      repository.findAll.mockResolvedValue(events);

      await expect(service.findAll(42)).resolves.toBe(events);
      expect(repository.findAll).toHaveBeenCalledWith(42);
    });
  });

  describe('findAllByInvestment', () => {
    it('returns events after confirming investment ownership', async () => {
      const events = [event()];
      repository.findAllByInvestment.mockResolvedValue(events);

      await expect(service.findAllByInvestment('7', 42)).resolves.toBe(events);
      expect(investmentRepository.findOne).toHaveBeenCalledWith(7, 42);
      expect(repository.findAllByInvestment).toHaveBeenCalledWith('7');
    });

    it('does not return events when the user does not own the investment', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByInvestment('7', 42)).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findAllByInvestment).not.toHaveBeenCalled();
    });

    it('returns events without an ownership lookup when no user is supplied', async () => {
      const events = [event()];
      repository.findAllByInvestment.mockResolvedValue(events);

      await expect(service.findAllByInvestment('7')).resolves.toBe(events);
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns null when the event does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('3', 42)).resolves.toBeNull();
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns an event after confirming ownership of its investment', async () => {
      const savedEvent = event();
      repository.findOne.mockResolvedValue(savedEvent);

      await expect(service.findOne('3', 42)).resolves.toBe(savedEvent);
      expect(investmentRepository.findOne).toHaveBeenCalledWith(7, 42);
    });

    it('returns an event without an ownership lookup when no user is supplied', async () => {
      const savedEvent = event();
      repository.findOne.mockResolvedValue(savedEvent);

      await expect(service.findOne('3')).resolves.toBe(savedEvent);
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('returns null without updating when the event does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('3', { notes: 'updated' })).resolves.toBeNull();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
      ['existing transaction link', { linkedTransactionId: 12 }, {}],
      ['existing benefit link', { linkedBenefitId: 15 }, {}],
      ['new transaction link', {}, { linkedTransactionId: '12' }],
      ['new benefit link', {}, { linkedBenefitId: '15' }],
    ])('rejects editing an event with an %s', async (_case, existing, update) => {
      repository.findOne.mockResolvedValue(event(existing));

      await expect(service.update('3', update as never)).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects updating an event in a closed investment', async () => {
      repository.findOne.mockResolvedValue(event());
      investmentRepository.findOne.mockResolvedValue({ status: 'closed' });

      await expect(service.update('3', { notes: 'updated' }, 42)).rejects.toThrow(
        'Closed investments cannot be modified.',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('validates a replacement investment before moving the event', async () => {
      repository.findOne.mockResolvedValue(event());
      investmentRepository.findOne
        .mockResolvedValueOnce({ status: 'active' })
        .mockResolvedValueOnce({ status: 'active' })
        .mockResolvedValueOnce(null);

      await expect(service.update('3', { investmentId: '8' }, 42)).rejects.toBeInstanceOf(NotFoundException);
      expect(investmentRepository.findOne).toHaveBeenNthCalledWith(1, 7, 42);
      expect(investmentRepository.findOne).toHaveBeenNthCalledWith(2, 7, 42);
      expect(investmentRepository.findOne).toHaveBeenNthCalledWith(3, 8, 42);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects an update that makes an event an unconfirmed income credit', async () => {
      repository.findOne.mockResolvedValue(event());

      await expect(
        service.update('3', {
          eventType: InvestmentEventType.INCOME_CREDIT,
          status: InvestmentEventStatus.PENDING,
        }, 42),
      ).rejects.toThrow('Income credit must be recorded as a confirmed event.');
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates an eligible unlinked event', async () => {
      const data = { notes: 'adjusted' };
      const updatedEvent = event({ notes: 'adjusted' });
      repository.findOne.mockResolvedValue(event());
      repository.update.mockResolvedValue(updatedEvent);

      await expect(service.update('3', data, 42)).resolves.toBe(updatedEvent);
      expect(repository.update).toHaveBeenCalledWith('3', data);
    });
  });

  describe('remove', () => {
    it('does nothing when the event does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('3', 42)).resolves.toBeUndefined();
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it.each([
      ['transaction-linked', { linkedTransactionId: 12 }],
      ['benefit-linked', { linkedBenefitId: 15 }],
    ])('rejects deleting a %s event independently', async (_case, linkedFields) => {
      repository.findOne.mockResolvedValue(event(linkedFields));

      await expect(service.remove('3')).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting an event from a closed investment', async () => {
      repository.findOne.mockResolvedValue(event());
      investmentRepository.findOne.mockResolvedValue({ status: 'closed' });

      await expect(service.remove('3', 42)).rejects.toThrow('Closed investments cannot be modified.');
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('deletes an unlinked event after confirming ownership and investment status', async () => {
      repository.findOne.mockResolvedValue(event());
      repository.delete.mockResolvedValue(undefined);

      await expect(service.remove('3', 42)).resolves.toBeUndefined();
      expect(investmentRepository.findOne).toHaveBeenCalledWith(7, 42);
      expect(repository.delete).toHaveBeenCalledWith('3');
    });
  });
});