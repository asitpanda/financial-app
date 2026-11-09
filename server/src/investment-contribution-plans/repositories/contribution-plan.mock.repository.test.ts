import { InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContributionPlanMockRepository } from './contribution-plan.mock.repository';

describe('ContributionPlanMockRepository', () => {
  let repository: ContributionPlanMockRepository;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('../../mockdata', () => ({
      mockInvestmentContributionPlansData: [
        {
          id: 1,
          investmentId: 1,
          status: 'active',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          historicalImportMode: 'TRACK_FROM_TODAY',
          anchorDate: new Date('2026-01-01T00:00:00.000Z'),
          lastGeneratedDueDate: null,
          nextDueDate: null,
          endDate: null,
          reminderDaysBefore: null,
          autoCreateEvent: false,
          notes: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 2,
          investmentId: 1,
          status: 'paused',
          amount: 200,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          historicalImportMode: 'TRACK_FROM_TODAY',
          anchorDate: new Date('2026-01-01T00:00:00.000Z'),
          lastGeneratedDueDate: null,
          nextDueDate: null,
          endDate: null,
          reminderDaysBefore: null,
          autoCreateEvent: false,
          notes: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          id: 3,
          investmentId: 2,
          status: 'active',
          amount: 300,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          historicalImportMode: 'TRACK_FROM_TODAY',
          anchorDate: new Date('2026-01-01T00:00:00.000Z'),
          lastGeneratedDueDate: null,
          nextDueDate: null,
          endDate: null,
          reminderDaysBefore: null,
          autoCreateEvent: false,
          notes: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
    }));
    vi.doMock('../../mockdata/investmentEvents', () => ({ mockInvestmentEventsData: [] }));
    vi.doMock('../../mockdata/investments', () => ({
      mockInvestmentsData: [
        { id: 1, userId: 1, status: 'active', totalInvested: 0, currentValue: 0 },
        { id: 2, userId: 1, status: 'active', totalInvested: 0, currentValue: 0 },
      ],
    }));
    const { ContributionPlanMockRepository: Repository } = await import('./contribution-plan.mock.repository');
    repository = new Repository();
  });

  describe('findAllByUser', () => {
    it('returns only owned plans ordered by investment and most recent update', async () => {
      const plans = await repository.findAllByUser(1);

      expect(plans.map(({ id }) => id)).toEqual([2, 1, 3]);
      await expect(repository.findAllByUser(999)).resolves.toEqual([]);
    });
  });

  describe('create', () => {
    it('normalizes persisted values and applies optional-field defaults', async () => {
      const created = await repository.create({
        investmentId: '2',
        status: 'paused',
        amount: '125.50' as never,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2026-01-01',
      } as never);

      expect(created).toMatchObject({
        investmentId: 2,
        status: 'paused',
        amount: 125.5,
        anchorDate: new Date('2026-01-01'),
        historicalImportMode: 'TRACK_FROM_TODAY',
        reminderDaysBefore: null,
        nextDueDate: null,
        endDate: null,
        autoCreateEvent: false,
        notes: null,
      });
      await expect(repository.findOne(String(created.id))).resolves.toEqual(created);
    });

    it('starts plan and event identifiers at one when their stores are empty', async () => {
      vi.doMock('../../mockdata', () => ({ mockInvestmentContributionPlansData: [] }));
      vi.doMock('../../mockdata/investmentEvents', () => ({ mockInvestmentEventsData: [] }));
      vi.doMock('../../mockdata/investments', () => ({
        mockInvestmentsData: [{ id: 2, userId: 1, status: 'active', totalInvested: 0, currentValue: 0 }],
      }));
      vi.resetModules();
      const { ContributionPlanMockRepository: EmptyRepository } = await import('./contribution-plan.mock.repository');
      const emptyRepository = new EmptyRepository();

      const result = await emptyRepository.createPlanWithHistoricalEvents({
        investmentId: '2',
        userId: 1,
        planPayload: {
          investmentId: '2',
          status: 'paused',
          amount: 25,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [{
          dueDate: '2026-01-01',
          selected: true,
          eventType: InvestmentEventType.CONTRIBUTION,
        } as never],
      });

      expect(result.plan.id).toBe(1);
      expect(result.historicalEvents[0].id).toBe(1);
    });
  });

  describe('findAllByInvestment', () => {
    it('matches the numeric investment ID and returns no plans for an unknown investment', async () => {
      await expect(repository.findAllByInvestment('1')).resolves.toMatchObject([{ id: 1 }, { id: 2 }]);
      await expect(repository.findAllByInvestment('999')).resolves.toEqual([]);
    });
  });

  describe('findAllByInvestmentIds', () => {
    it('returns plans for only the requested investment IDs', async () => {
      await expect(repository.findAllByInvestmentIds([2])).resolves.toMatchObject([{ id: 3 }]);
      await expect(repository.findAllByInvestmentIds([])).resolves.toEqual([]);
    });
  });

  describe('findAllActiveByUser', () => {
    it('returns active plans only for investments owned by the user', async () => {
      await expect(repository.findAllActiveByUser(1)).resolves.toMatchObject([{ id: 1 }, { id: 3 }]);
      await expect(repository.findAllActiveByUser(999)).resolves.toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns null when the plan does not exist', async () => {
      await expect(repository.findOne('999')).resolves.toBeNull();
    });
  });

  describe('createPlanWithHistoricalEvents', () => {
    it('persists selected historical events for an owned investment', async () => {
      const result = await repository.createPlanWithHistoricalEvents({
        investmentId: '2',
        userId: 1,
        planPayload: {
          investmentId: '2',
          status: 'paused',
          amount: 200,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [
          {
            dueDate: '2026-01-15',
            amount: 75,
            selected: true,
            status: 'CONFIRMED',
            eventType: InvestmentEventType.CONTRIBUTION,
          } as never,
          { dueDate: '2026-01-20', amount: 50, selected: false } as never,
        ],
      });

      expect(result.plan).toMatchObject({ investmentId: 2, amount: 200, status: 'paused' });
      expect(result.historicalEvents).toHaveLength(1);
      expect(result.historicalEvents[0]).toMatchObject({
        investmentId: 2,
        eventType: InvestmentEventType.CONTRIBUTION,
        dueDate: new Date('2026-01-15'),
        amount: 75,
        status: 'CONFIRMED',
        eventSource: 'HISTORICAL_IMPORT',
      });
    });

    it('updates derived totals from confirmed principal and income events only', async () => {
      const { mockInvestmentsData } = await import('../../mockdata/investments');

      const result = await repository.createPlanWithHistoricalEvents({
        investmentId: '2',
        userId: 1,
        planPayload: {
          investmentId: '2',
          status: 'paused',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [
          { dueDate: '2026-01-01', amount: 150, selected: true, status: 'CONFIRMED', eventType: InvestmentEventType.OPENING_BALANCE },
          { dueDate: '2026-01-02', amount: 25, selected: true, status: 'CONFIRMED', eventType: InvestmentEventType.OPENING_INCOME_CREDIT },
          { dueDate: '2026-01-03', amount: 10, selected: true, status: 'CONFIRMED', eventType: InvestmentEventType.WITHDRAWAL_PRINCIPAL },
          { dueDate: '2026-01-04', amount: 999, selected: true, status: 'PENDING', eventType: InvestmentEventType.CONTRIBUTION },
        ] as never,
      });

      expect(result.historicalEvents).toHaveLength(4);
      expect(mockInvestmentsData.find(({ id }) => id === 2)).toMatchObject({
        totalInvested: 140,
        currentValue: 165,
      });
    });

    it('rejects a second active plan for the same investment', async () => {
      await expect(repository.createPlanWithHistoricalEvents({
        investmentId: '1',
        userId: 1,
        planPayload: {
          investmentId: '1',
          status: 'active',
          amount: 200,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [],
      })).rejects.toThrow('An active recurring plan already exists for this investment');
    });
  });

  describe('findActiveByInvestment', () => {
    it('returns the active plan and null when the investment has no active plan', async () => {
      await expect(repository.findActiveByInvestment('1')).resolves.toMatchObject({ id: 1 });
      await expect(repository.findActiveByInvestment('999')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('normalizes changed values, preserves omitted fields, and returns null for an unknown plan', async () => {
      const updated = await repository.update('1', {
        amount: '250',
        reminderDaysBefore: '3',
        anchorDate: '2026-02-01',
        nextDueDate: null,
        autoCreateEvent: true,
      } as never);

      expect(updated).toMatchObject({
        id: 1,
        amount: 250,
        reminderDaysBefore: 3,
        anchorDate: new Date('2026-02-01'),
        nextDueDate: null,
        autoCreateEvent: true,
        status: 'active',
      });
      await expect(repository.update('999', {} as never)).resolves.toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the selected plan without affecting other plans', async () => {
      await repository.delete('1');

      await expect(repository.findOne('1')).resolves.toBeNull();
      await expect(repository.findOne('2')).resolves.toMatchObject({ id: 2 });
    });
  });

  describe('generateDueRecurringInvestmentEvents', () => {
    it('generates due occurrences and advances a month-end schedule without shifting its anchor day', async () => {
      const createdPlan = await repository.create({
        investmentId: '2',
        status: 'active',
        amount: 50,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2099-01-31',
        nextDueDate: '2099-01-31',
      } as never);

      await expect(
        repository.generateDueRecurringInvestmentEvents({ cutoffDate: new Date('2099-03-31T00:00:00.000Z') }),
      ).resolves.toEqual({ processedPlans: 1, generatedEvents: 3 });
      await expect(repository.findOne(String(createdPlan.id))).resolves.toMatchObject({
        lastGeneratedDueDate: new Date('2099-03-31T00:00:00.000Z'),
        nextDueDate: new Date('2099-04-30T00:00:00.000Z'),
      });
    });

    it('respects the processing limit when several plans are due', async () => {
      const firstPlan = await repository.create({
        investmentId: '2',
        status: 'active',
        amount: 50,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2099-01-01',
        nextDueDate: '2099-01-01',
      } as never);
      const secondPlan = await repository.create({
        investmentId: '2',
        status: 'active',
        amount: 75,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2099-01-02',
        nextDueDate: '2099-01-02',
      } as never);

      await expect(repository.generateDueRecurringInvestmentEvents({
        cutoffDate: new Date('2099-01-31T00:00:00.000Z'),
        limit: 1,
      })).resolves.toEqual({ processedPlans: 1, generatedEvents: 1 });
      await expect(repository.findOne(String(firstPlan.id))).resolves.toMatchObject({
        lastGeneratedDueDate: new Date('2099-01-01T00:00:00.000Z'),
      });
      await expect(repository.findOne(String(secondPlan.id))).resolves.toMatchObject({ nextDueDate: new Date('2099-01-02') });
    });

    it('does not duplicate an existing occurrence and clears dates beyond the plan end', async () => {
      const eventDate = new Date('2099-01-31T00:00:00.000Z');
      const { plan: existingPlan, historicalEvents } = await repository.createPlanWithHistoricalEvents({
        investmentId: '2',
        userId: 1,
        planPayload: {
          investmentId: '2',
          status: 'paused',
          amount: 50,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2099-01-31',
          nextDueDate: '2099-01-31',
          endDate: '2099-01-31',
        } as never,
        selectedHistoricalItems: [{
          dueDate: '2099-01-31',
          amount: 50,
          selected: true,
          status: 'EXPECTED',
          eventType: InvestmentEventType.CONTRIBUTION,
        } as never],
      });
      expect(historicalEvents).toHaveLength(1);
      await repository.update(String(existingPlan.id), { status: 'active' });

      await expect(repository.generateDueRecurringInvestmentEvents({
        cutoffDate: new Date('2099-02-28T00:00:00.000Z'),
      })).resolves.toEqual({ processedPlans: 1, generatedEvents: 0 });
      await expect(repository.findOne(String(existingPlan.id))).resolves.toMatchObject({
        lastGeneratedDueDate: eventDate,
        nextDueDate: null,
      });
    });
  });

  describe('skipCurrentContribution', () => {
    it('creates a skipped event, advances the plan, and rejects a repeated skip', async () => {
      const result = await repository.skipCurrentContribution({
        investmentId: '1',
        planId: '1',
        userId: 1,
        dueDate: '2026-02-01',
        nextDueDate: '2026-03-01',
        notes: '  ',
      } as never);

      expect(result).toMatchObject({
        plan: { id: 1, nextDueDate: new Date('2026-03-01') },
        skippedEvent: {
          investmentId: 1,
          recurringPlanId: 1,
          eventType: InvestmentEventType.CONTRIBUTION,
          dueDate: new Date('2026-02-01'),
          status: 'SKIPPED',
          amount: 100,
          notes: 'Skipped scheduled contribution',
        },
      });
      await expect(repository.skipCurrentContribution({
        investmentId: '1',
        planId: '1',
        userId: 1,
        dueDate: '2026-02-01',
      } as never)).rejects.toThrow('This due contribution was already skipped');
    });

    it('updates an existing pending event instead of creating a duplicate', async () => {
      const { plan } = await repository.createPlanWithHistoricalEvents({
        investmentId: '1',
        userId: 1,
        planPayload: {
          investmentId: '1',
          status: 'paused',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [{
          dueDate: '2026-02-01',
          selected: true,
          status: 'PENDING',
          eventType: InvestmentEventType.CONTRIBUTION,
        } as never],
      });

      const result = await repository.skipCurrentContribution({
        investmentId: '1',
        planId: String(plan.id),
        userId: 1,
        dueDate: '2026-02-01',
        notes: '  postponed  ',
      } as never);

      expect(result.skippedEvent).toMatchObject({
        recurringPlanId: plan.id,
        dueDate: new Date('2026-02-01'),
        status: 'SKIPPED',
        notes: 'postponed',
      });
    });

    it('rejects plans outside the investment and investments outside the user', async () => {
      await expect(repository.skipCurrentContribution({
        investmentId: '2',
        planId: '1',
        userId: 1,
        dueDate: '2026-02-01',
      } as never)).rejects.toThrow('Recurring plan not found');
      await expect(repository.skipCurrentContribution({
        investmentId: '1',
        planId: '1',
        userId: 999,
        dueDate: '2026-02-01',
      } as never)).rejects.toThrow('Investment not found');
    });

    it('does not skip a contribution that has already been confirmed', async () => {
      const { plan } = await repository.createPlanWithHistoricalEvents({
        investmentId: '1',
        userId: 1,
        planPayload: {
          investmentId: '1',
          status: 'paused',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never,
        selectedHistoricalItems: [{
          dueDate: '2026-02-01',
          selected: true,
          status: 'CONFIRMED',
          eventType: InvestmentEventType.CONTRIBUTION,
        } as never],
      });

      await expect(repository.skipCurrentContribution({
        investmentId: '1',
        planId: String(plan.id),
        userId: 1,
        dueDate: '2026-02-01',
      } as never)).rejects.toThrow('This due contribution is already recorded as paid');
    });
  });
});