import { InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventMockRepository } from './event.mock.repository';

describe('EventMockRepository', () => {
  let repository: EventMockRepository;

  beforeEach(async () => {
    vi.resetModules();
    const { EventMockRepository: Repository } = await import('./event.mock.repository');
    repository = new Repository();
  });

  describe('create', () => {
    it('normalizes event fields and defaults optional values', async () => {
      const data = {
        investmentId: '1',
        eventType: InvestmentEventType.CONTRIBUTION,
        eventDate: '2026-10-25T00:00:00.000Z',
        dueDate: '2026-11-25T00:00:00.000Z',
        recurringPlanId: '8',
        sequenceNumber: 2,
      };

      await expect(repository.create(data as never)).resolves.toMatchObject({
        id: 4,
        investmentId: 1,
        recurringPlanId: 8,
        linkedTransactionId: null,
        linkedBenefitId: null,
        eventType: InvestmentEventType.CONTRIBUTION,
        dueDate: new Date(data.dueDate),
        status: 'PENDING',
        eventSource: 'MANUAL',
        sequenceNumber: 2,
        eventDate: new Date(data.eventDate),
        amount: null,
        units: null,
        pricePerUnit: null,
        netAmount: null,
        notes: null,
        meta: null,
      });
    });

    it('recalculates investment totals from confirmed principal flows and income credits', async () => {
      const eventDate = '2026-10-25T00:00:00.000Z';
      const events = [
        { eventType: InvestmentEventType.CONTRIBUTION, amount: 500, status: 'CONFIRMED' },
        { eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL, amount: 100, status: 'CONFIRMED' },
        { eventType: InvestmentEventType.INCOME_CREDIT, amount: 50, status: 'CONFIRMED' },
        { eventType: InvestmentEventType.CONTRIBUTION, amount: 800, status: 'PENDING' },
      ];

      for (const item of events) {
        await repository.create({
          investmentId: '1',
          eventType: item.eventType,
          eventDate,
          amount: item.amount,
          status: item.status,
        } as never);
      }

      const { mockInvestmentsData } = await import('../../mockdata/investments');
      expect(mockInvestmentsData.find(({ id }) => id === 1)).toMatchObject({
        totalInvested: 12400,
        currentValue: 12450,
      });
    });

    it('counts insurance premiums as invested capital without manufacturing current value', async () => {
      const { mockInvestmentsData } = await import('../../mockdata/investments');
      const investment = mockInvestmentsData.find(({ id }) => id === 5)!;
      investment.currentValue = 180000;

      await repository.create({
        investmentId: '5',
        eventType: InvestmentEventType.PREMIUM,
        eventDate: '2026-10-25T00:00:00.000Z',
        amount: 300,
        status: 'CONFIRMED',
      } as never);

      expect(investment).toMatchObject({ totalInvested: 6300, currentValue: 180000 });
    });

    it('does not recalculate totals for protection expense products', async () => {
      const { mockInvestmentsData } = await import('../../mockdata/investments');
      const investment = mockInvestmentsData.find(({ id }) => id === 8)!;
      investment.totalInvested = 900;
      investment.currentValue = 1200;

      await repository.create({
        investmentId: '8',
        eventType: InvestmentEventType.PREMIUM,
        eventDate: '2026-10-25T00:00:00.000Z',
        amount: 400,
        status: 'CONFIRMED',
      } as never);

      expect(investment).toMatchObject({ totalInvested: 900, currentValue: 1200 });
    });
  });

  describe('findAll', () => {
    it('returns only events for investments owned by the requested user', async () => {
      await expect(repository.findAll(1)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1, investmentId: 1 }),
          expect.objectContaining({ id: 3, investmentId: 5 }),
        ]),
      );
      await expect(repository.findAll(987654)).resolves.toEqual([]);
    });
  });

  describe('findAllByInvestment', () => {
    it('returns only events for the requested investment', async () => {
      await expect(repository.findAllByInvestment('5')).resolves.toMatchObject([
        { id: 3, investmentId: 5 },
      ]);
    });
  });

  describe('findOne', () => {
    it('returns null when the event does not exist', async () => {
      await expect(repository.findOne('987654')).resolves.toBeUndefined();
    });

    it('returns the requested event by its numeric ID', async () => {
      await expect(repository.findOne('1')).resolves.toMatchObject({
        id: 1,
        investmentId: 1,
        eventType: InvestmentEventType.CONTRIBUTION,
      });
    });
  });

  describe('update', () => {
    it('normalizes updated identifiers and date fields', async () => {
      const date = '2027-01-01T00:00:00.000Z';

      await expect(
        repository.update('1', {
          linkedTransactionId: '14',
          recurringPlanId: '',
          eventDate: date,
          amount: 0,
        } as never),
      ).resolves.toMatchObject({
        linkedTransactionId: 14,
        recurringPlanId: null,
        eventDate: new Date(date),
        amount: 0,
      });
    });

    it('returns null when the event does not exist', async () => {
      await expect(repository.update('987654', { notes: 'Updated' })).resolves.toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the event and recalculates its investment totals', async () => {
      await repository.delete('1');

      await expect(repository.findOne('1')).resolves.toBeUndefined();
      const { mockInvestmentsData } = await import('../../mockdata/investments');
      expect(mockInvestmentsData.find(({ id }) => id === 1)).toMatchObject({
        totalInvested: 0,
        currentValue: 0,
      });
    });
  });
});