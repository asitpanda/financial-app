import { InvestmentBenefitStatus, InvestmentBenefitType, InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BenefitMockRepository } from './benefit.mock.repository';

describe('BenefitMockRepository', () => {
  let repository: BenefitMockRepository;

  beforeEach(async () => {
    vi.resetModules();
    const { BenefitMockRepository: Repository } = await import('./benefit.mock.repository');
    repository = new Repository();
  });

  describe('create', () => {
    it('creates an expected benefit and defaults optional fields', async () => {
      const data = {
        benefitType: InvestmentBenefitType.COUPON,
        amount: 0,
        benefitDate: '2026-10-25T00:00:00.000Z',
      };

      await expect(repository.create('987654', data)).resolves.toMatchObject({
        investmentId: 987654,
        benefitType: InvestmentBenefitType.COUPON,
        amount: 0,
        benefitDate: new Date(data.benefitDate),
        status: InvestmentBenefitStatus.EXPECTED,
        destinationAccountId: null,
        notes: null,
      });
    });

    it('starts benefit and event IDs at one when all mock stores are empty', async () => {
      vi.doMock('../../mockdata/investments', () => ({
        mockInvestmentsData: [{ id: 5, userId: 1, status: 'active', currentValue: 100 }],
      }));
      vi.doMock('../../mockdata/investmentBenefits', () => ({ mockInvestmentBenefitsData: [] }));
      vi.doMock('../../mockdata', () => ({ mockInvestmentEventsData: [] }));
      vi.resetModules();

      try {
        const { BenefitMockRepository: EmptyRepository } = await import('./benefit.mock.repository');
        const emptyRepository = new EmptyRepository();
        const created = await emptyRepository.quickRealize('5', 1, {
          benefitType: InvestmentBenefitType.OTHER,
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 25,
        } as never);

        expect(created.benefit.id).toBe(1);
        expect(created.events[0].id).toBe(1);
      } finally {
        vi.doUnmock('../../mockdata/investments');
        vi.doUnmock('../../mockdata/investmentBenefits');
        vi.doUnmock('../../mockdata');
        vi.resetModules();
      }
    });
  });

  describe('findAll', () => {
    it('returns seeded benefits only for investments owned by the requested user', async () => {
      await expect(repository.findAll(1)).resolves.toContainEqual(
        expect.objectContaining({ id: 101, investmentId: 5 }),
      );
      await expect(repository.findAll(987654)).resolves.toEqual([]);
    });
  });

  describe('findAllByInvestment', () => {
    it('returns benefits associated with the requested investment', async () => {
      await expect(repository.findAllByInvestment('5')).resolves.toMatchObject([
        { id: 101, investmentId: 5 },
        { id: 102, investmentId: 5 },
        { id: 103, investmentId: 5 },
      ]);
    });
  });

  describe('findAllByInvestmentWithDetails', () => {
    it('attaches only events linked to each investment benefit', async () => {
      const results = await repository.findAllByInvestmentWithDetails('5');

      expect(results.map(({ id }) => id)).toEqual([101, 102, 103]);
      expect(results.every((item) => item.realizedEvents.every((event) => event.linkedBenefitId === item.id))).toBe(
        true,
      );
    });
  });

  describe('findOne', () => {
    it('returns null for a benefit that does not exist', async () => {
      await expect(repository.findOne('987654')).resolves.toBeNull();
    });
  });

  describe('findOneWithDetails', () => {
    it('returns the benefit with its linked realization events', async () => {
      const result = await repository.findOneWithDetails('101');

      expect(result).toMatchObject({ id: 101, realizedEvents: expect.any(Array) });
      expect(result?.realizedEvents.every((event) => event.linkedBenefitId === 101)).toBe(true);
    });
  });

  describe('update', () => {
    it('updates an existing benefit and leaves it unchanged when the ID is missing', async () => {
      const updated = await repository.update('101', {
        amount: 51000,
        status: InvestmentBenefitStatus.CANCELLED,
      });

      expect(updated).toMatchObject({ amount: 51000, status: InvestmentBenefitStatus.CANCELLED });
      await expect(repository.update('987654', { amount: 1 })).resolves.toBeNull();
    });

    it('applies supplied fields and clears nullable destination and notes', async () => {
      const updated = await repository.update('101', {
        benefitType: InvestmentBenefitType.OTHER,
        amount: 12,
        benefitDate: '2027-01-02T00:00:00.000Z',
        status: InvestmentBenefitStatus.CANCELLED,
        destinationAccountId: null,
        notes: null,
      });

      expect(updated).toMatchObject({
        benefitType: InvestmentBenefitType.OTHER,
        amount: 12,
        benefitDate: new Date('2027-01-02T00:00:00.000Z'),
        status: InvestmentBenefitStatus.CANCELLED,
        destinationAccountId: null,
        notes: null,
      });
    });
  });

  describe('delete', () => {
    it('removes the requested benefit from subsequent lookups', async () => {
      await repository.delete('101');

      await expect(repository.findOne('101')).resolves.toBeNull();
    });
  });

  describe('realize', () => {
    it('records realization events and marks the expected benefit received', async () => {
      const result = await repository.realize('101', '5', 1, {
        components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 50000 }],
      });

      expect(result.benefit.status).toBe(InvestmentBenefitStatus.RECEIVED);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        linkedBenefitId: 101,
        investmentId: 5,
        amount: 50000,
        eventType: InvestmentEventType.BENEFIT_RECEIPT,
      });
      await expect(repository.findOne('101')).resolves.toMatchObject({ status: InvestmentBenefitStatus.RECEIVED });
    });

    it('uses component event metadata and closes the investment when requested', async () => {
      const eventDate = '2026-11-01T00:00:00.000Z';
      const result = await repository.realize('101', '5', 1, {
        components: [{
          eventType: InvestmentEventType.BENEFIT_RECEIPT,
          amount: 50000,
          eventDate,
          notes: 'Coupon paid',
        }],
        closesInvestment: true,
      });

      expect(result.events[0]).toMatchObject({
        eventDate: new Date(eventDate),
        notes: 'Coupon paid',
      });
      const { mockInvestmentsData } = await import('../../mockdata/investments');
      expect(mockInvestmentsData.find(({ id }) => id === 5)).toMatchObject({ status: 'closed', currentValue: 0 });
    });

    it('rejects realizing a benefit that is missing or already received', async () => {
      const data = { components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 1 }] };

      await expect(repository.realize('987654', '5', 1, data)).rejects.toThrow('Investment benefit not found');
      await expect(repository.realize('101', '5', 1, data)).resolves.toMatchObject({
        benefit: { status: InvestmentBenefitStatus.RECEIVED },
      });
      await expect(repository.realize('101', '5', 1, data)).rejects.toThrow('Investment benefit was already realized');
    });

    it('rejects realization when the benefit is not owned by the user', async () => {
      await expect(
        repository.realize('101', '5', 987654, {
          components: [{ eventType: InvestmentEventType.BENEFIT_RECEIPT, amount: 50000 }],
        }),
      ).rejects.toThrow('Investment benefit not found');
    });
  });

  describe('quickRealize', () => {
    it('creates a received benefit and its realization event in one operation', async () => {
      const result = await repository.quickRealize('5', 1, {
        benefitType: InvestmentBenefitType.OTHER,
        eventType: InvestmentEventType.BENEFIT_RECEIPT,
        amount: 125,
      } as never);

      expect(result.benefit).toMatchObject({
        benefitType: InvestmentBenefitType.OTHER,
        amount: 125,
        status: InvestmentBenefitStatus.RECEIVED,
      });
      expect(result.events).toHaveLength(1);
      expect(result.events[0].amount).toBe(125);
    });
  });
});