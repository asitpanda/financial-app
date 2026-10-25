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
  });
});