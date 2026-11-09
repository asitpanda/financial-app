import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InvestmentEventType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvestmentContributionPlanRecord } from './investment-contribution-plan.types';
import { InvestmentContributionPlansService } from './investment-contribution-plans.service';
import type { RecurringScheduleCalculator } from './recurring-schedule-calculator.service';
import type { ContributionPlanRepository } from './repositories/contribution-plan.repository';
import type { InvestmentRepository } from '../investments/repositories/investment.repository';

function createService() {
  const repository = {
    create: vi.fn(),
    findAllByUser: vi.fn(),
    findAllByInvestmentIds: vi.fn(),
    findAllActiveByUser: vi.fn(),
    findActiveByInvestment: vi.fn(),
    createPlanWithHistoricalEvents: vi.fn(),
    findAllByInvestment: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    skipCurrentContribution: vi.fn(),
    generateDueRecurringInvestmentEvents: vi.fn(),
  };
  const scheduleCalculator = {
    calculateDueDates: vi.fn().mockReturnValue([]),
    firstDueDateOnOrAfter: vi.fn().mockReturnValue(new Date('2026-06-01T00:00:00.000Z')),
  };
  const investmentRepository = {
    findOne: vi.fn(),
  };

  return {
    service: new InvestmentContributionPlansService(
      repository as unknown as ContributionPlanRepository,
      scheduleCalculator as unknown as RecurringScheduleCalculator,
      investmentRepository as unknown as InvestmentRepository,
    ),
    repository,
    scheduleCalculator,
    investmentRepository,
  };
}

function plan(overrides: Partial<InvestmentContributionPlanRecord> = {}): InvestmentContributionPlanRecord {
  return {
    id: 7,
    investmentId: 11,
    status: 'active',
    amount: 100,
    cadenceUnit: 'month',
    cadenceInterval: 1,
    historicalImportMode: 'TRACK_FROM_TODAY',
    anchorDate: new Date('2026-01-01T00:00:00.000Z'),
    lastGeneratedDueDate: null,
    nextDueDate: new Date('2026-02-01T00:00:00.000Z'),
    endDate: null,
    reminderDaysBefore: null,
    autoCreateEvent: false,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function openInvestment() {
  return { id: 11, userId: 42, status: 'open' };
}

describe('InvestmentContributionPlansService', () => {
  let service: InvestmentContributionPlansService;
  let repository: ReturnType<typeof createService>['repository'];
  let scheduleCalculator: ReturnType<typeof createService>['scheduleCalculator'];
  let investmentRepository: ReturnType<typeof createService>['investmentRepository'];

  beforeEach(() => {
    ({ service, repository, scheduleCalculator, investmentRepository } = createService());
    investmentRepository.findOne.mockResolvedValue(openInvestment());
    repository.findActiveByInvestment.mockResolvedValue(null);
  });

  describe('findAllByUser', () => {
    it('returns the repository result for the requested user', async () => {
      const plans = [plan()];
      repository.findAllByUser.mockResolvedValue(plans);

      await expect(service.findAllByUser(42)).resolves.toBe(plans);
      expect(repository.findAllByUser).toHaveBeenCalledWith(42);
    });
  });

  describe('findAllByInvestmentIds', () => {
    it('returns the repository result for the requested investments', async () => {
      const plans = [plan()];
      repository.findAllByInvestmentIds.mockResolvedValue(plans);

      await expect(service.findAllByInvestmentIds([11, 12])).resolves.toBe(plans);
      expect(repository.findAllByInvestmentIds).toHaveBeenCalledWith([11, 12]);
    });
  });

  describe('findAllActiveByUser', () => {
    it('returns only the repository result for the requested user', async () => {
      const plans = [plan()];
      repository.findAllActiveByUser.mockResolvedValue(plans);

      await expect(service.findAllActiveByUser(42)).resolves.toBe(plans);
      expect(repository.findAllActiveByUser).toHaveBeenCalledWith(42);
    });
  });

  describe('findAllByInvestment', () => {
    it('verifies ownership before listing plans when a user is supplied', async () => {
      const plans = [plan()];
      repository.findAllByInvestment.mockResolvedValue(plans);

      await expect(service.findAllByInvestment('11', 42)).resolves.toBe(plans);
      expect(investmentRepository.findOne).toHaveBeenCalledWith(11, 42);
      expect(repository.findAllByInvestment).toHaveBeenCalledWith('11');
    });

    it('does not list plans when the user does not own the investment', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(service.findAllByInvestment('11', 42)).rejects.toThrow(NotFoundException);
      expect(repository.findAllByInvestment).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates an active plan after verifying investment ownership and availability', async () => {
      const dto = {
        investmentId: '11',
        status: 'active',
        amount: 100,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2026-01-01',
      };
      repository.create.mockResolvedValue(plan());

      await expect(service.create(dto as never, 42)).resolves.toEqual(plan());
      expect(investmentRepository.findOne).toHaveBeenCalledWith(11, 42);
      expect(repository.findActiveByInvestment).toHaveBeenCalledWith('11');
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('rejects an active plan when another active plan already exists', async () => {
      repository.findActiveByInvestment.mockResolvedValue(plan());

      await expect(
        service.create({
          investmentId: '11',
          status: 'active',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects changes to a closed investment', async () => {
      investmentRepository.findOne.mockResolvedValue({ ...openInvestment(), status: 'CLOSED' });

      await expect(
        service.create({
          investmentId: '11',
          status: 'active',
          amount: 100,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never, 42),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects non-positive contribution amounts', async () => {
      await expect(
        service.create({
          investmentId: '11',
          status: 'paused',
          amount: 0,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          anchorDate: '2026-01-01',
        } as never),
      ).rejects.toThrow('Contribution amount must be greater than 0');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects invalid cadence values, unsupported statuses, and malformed plan dates', async () => {
      const base = {
        investmentId: '11',
        status: 'paused',
        amount: 100,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2026-01-01',
      };

      await expect(service.create({ ...base, cadenceInterval: 1.5 } as never)).rejects.toThrow(
        'cadenceInterval must be a positive integer',
      );
      await expect(service.create({ ...base, cadenceUnit: 'fortnight' } as never)).rejects.toThrow(
        'Unsupported cadenceUnit: fortnight',
      );
      await expect(service.create({ ...base, status: 'draft' } as never)).rejects.toThrow(
        'status must be either active or paused',
      );
      await expect(service.create({ ...base, anchorDate: 'not-a-date' } as never)).rejects.toThrow(
        'Invalid anchorDate',
      );
      await expect(service.create({ ...base, endDate: '2025-12-31' } as never)).rejects.toThrow(
        'endDate cannot be earlier than anchorDate',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('allows a paused plan without checking for another active plan', async () => {
      const dto = {
        investmentId: '11',
        status: 'paused',
        amount: 100,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2026-01-01',
      };
      repository.create.mockResolvedValue(plan({ status: 'paused' }));

      await expect(service.create(dto as never, 42)).resolves.toMatchObject({ status: 'paused' });
      expect(repository.findActiveByInvestment).not.toHaveBeenCalled();
    });

    it('rejects a request when the user does not own the investment', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(service.create({
        investmentId: '11',
        status: 'paused',
        amount: 100,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2026-01-01',
      } as never, 42)).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('previewRecurringPlan', () => {
    it('returns no historical occurrences in TRACK_FROM_TODAY mode', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const nextDueDate = new Date('2026-06-01T00:00:00.000Z');
      scheduleCalculator.firstDueDateOnOrAfter.mockReturnValue(nextDueDate);

      await expect(
        service.previewRecurringPlan('11', {
          anchorDate: today,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          historicalImportMode: 'TRACK_FROM_TODAY',
        } as never),
      ).resolves.toEqual({
        investmentId: '11',
        historicalImportMode: 'TRACK_FROM_TODAY',
        historicalOccurrenceCount: 0,
        expectedHistoricalTotal: 0,
        nextDueDate,
        occurrences: [],
      });
    });

    it('previews only positive opening principal and income amounts', async () => {
      const today = new Date().toISOString().slice(0, 10);

      const result = await service.previewRecurringPlan('11', {
        anchorDate: today,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        historicalImportMode: 'OPENING_BALANCE',
        openingPrincipalAmount: 250,
        openingIncomeAmount: 0,
      } as never);

      expect(result).toMatchObject({
        historicalOccurrenceCount: 1,
        expectedHistoricalTotal: 250,
        occurrences: [
          {
            sequenceNumber: 1,
            dueDate: today,
            amount: 250,
            eventType: InvestmentEventType.OPENING_BALANCE,
          },
        ],
      });
    });

    it('rejects a preview request for an investment the user does not own', async () => {
      investmentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.previewRecurringPlan(
          '11',
          {
            anchorDate: '2026-01-01',
            cadenceUnit: 'month',
            cadenceInterval: 1,
            historicalImportMode: 'TRACK_FROM_TODAY',
          } as never,
          42,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(scheduleCalculator.calculateDueDates).not.toHaveBeenCalled();
    });

    it('returns an empty opening-balance preview when both amounts are non-positive', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await expect(service.previewRecurringPlan('11', {
        anchorDate: today,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        historicalImportMode: 'OPENING_BALANCE',
        openingPrincipalAmount: 0,
        openingIncomeAmount: -5,
      } as never)).resolves.toMatchObject({
        historicalOccurrenceCount: 0,
        expectedHistoricalTotal: 0,
        occurrences: [],
      });
    });

    it('rejects an unsupported historical import mode', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await expect(service.previewRecurringPlan('11', {
        anchorDate: today,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        historicalImportMode: 'GENERATE_ALL',
      } as never)).rejects.toThrow('Unsupported historicalImportMode: GENERATE_ALL');
    });
  });

  describe('confirmRecurringPlan', () => {
    const confirmedResult = { plan: plan(), historicalEvents: [] };

    it('persists only selected historical occurrences', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const dto = {
        anchorDate: today,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        amount: 100,
        historicalImportMode: 'TRACK_FROM_TODAY',
        reviewedHistoricalItems: [
          { dueDate: today, amount: 100, selected: true },
          { dueDate: today, amount: 200, selected: false },
        ],
      };
      repository.createPlanWithHistoricalEvents.mockResolvedValue(confirmedResult);

      await expect(service.confirmRecurringPlan('11', dto as never, 42)).resolves.toMatchObject({
        ...confirmedResult,
        nextDueDate: new Date('2026-06-01T00:00:00.000Z'),
      });
      expect(repository.createPlanWithHistoricalEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          investmentId: '11',
          userId: 42,
          selectedHistoricalItems: [dto.reviewedHistoricalItems[0]],
          planPayload: expect.objectContaining({ status: 'active' }),
        }),
        undefined,
      );
    });

    it('creates opening-balance historical events when none were reviewed', async () => {
      const today = new Date().toISOString().slice(0, 10);
      repository.createPlanWithHistoricalEvents.mockResolvedValue(confirmedResult);

      await service.confirmRecurringPlan('11', {
        anchorDate: today,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        amount: 100,
        historicalImportMode: 'OPENING_BALANCE',
        openingPrincipalAmount: 500,
        openingIncomeAmount: 25,
      } as never, 42);

      expect(repository.createPlanWithHistoricalEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedHistoricalItems: [
            expect.objectContaining({
              dueDate: today,
              amount: 500,
              eventType: InvestmentEventType.OPENING_BALANCE,
            }),
            expect.objectContaining({
              dueDate: today,
              amount: 25,
              eventType: InvestmentEventType.OPENING_INCOME_CREDIT,
            }),
          ],
        }),
        undefined,
      );
    });

    it('rejects an opening-balance plan without a positive opening amount', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await expect(
        service.confirmRecurringPlan('11', {
          anchorDate: today,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          amount: 100,
          historicalImportMode: 'OPENING_BALANCE',
          openingPrincipalAmount: 0,
          openingIncomeAmount: 0,
        } as never, 42),
      ).rejects.toThrow('OPENING_BALANCE requires opening principal and/or opening income amount');
      expect(repository.createPlanWithHistoricalEvents).not.toHaveBeenCalled();
    });

    it.each([
      ['before the anchor date', '2025-12-31', undefined, 'before anchorDate'],
      ['after the plan end date', '2026-02-01', '2026-01-31', 'after endDate'],
    ])('rejects a selected historical occurrence %s', async (_scenario, dueDate, endDate, message) => {
      await expect(service.confirmRecurringPlan('11', {
        anchorDate: '2026-01-01',
        endDate,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        amount: 100,
        historicalImportMode: 'TRACK_FROM_TODAY',
        reviewedHistoricalItems: [{ dueDate, amount: 10, selected: true }],
      } as never, 42)).rejects.toThrow(message);
      expect(repository.createPlanWithHistoricalEvents).not.toHaveBeenCalled();
    });

    it('uses the supplied transaction for the ownership check and repository write', async () => {
      const transaction = { investment: { findFirst: vi.fn().mockResolvedValue(openInvestment()) } };
      const today = new Date().toISOString().slice(0, 10);
      repository.createPlanWithHistoricalEvents.mockResolvedValue(confirmedResult);

      await service.confirmRecurringPlan('11', {
        anchorDate: today,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        amount: 100,
        historicalImportMode: 'TRACK_FROM_TODAY',
      } as never, 42, transaction as never);

      expect(transaction.investment.findFirst).toHaveBeenCalledWith({ where: { id: 11, userId: 42 } });
      expect(investmentRepository.findOne).not.toHaveBeenCalled();
      expect(repository.createPlanWithHistoricalEvents).toHaveBeenCalledWith(expect.any(Object), transaction);
    });

    it.each([
      ['already exists', ConflictException, 'already exists'],
      ['not found', NotFoundException, 'not found'],
      ['unexpected failure', InternalServerErrorException, 'Failed to confirm recurring plan'],
    ] as const)('maps repository error "%s" to its domain exception', async (message, exception, expectedMessage) => {
      const today = new Date().toISOString().slice(0, 10);
      repository.createPlanWithHistoricalEvents.mockRejectedValue(new Error(message));

      const confirmation = service.confirmRecurringPlan('11', {
          anchorDate: today,
          cadenceUnit: 'month',
          cadenceInterval: 1,
          amount: 100,
          historicalImportMode: 'TRACK_FROM_TODAY',
        } as never, 42);
      await expect(confirmation).rejects.toBeInstanceOf(exception);
      await expect(confirmation).rejects.toThrow(expectedMessage);
    });
  });

  describe('update', () => {
    it('rejects activating a plan when another active plan exists for its investment', async () => {
      repository.findOne.mockResolvedValue(plan());
      repository.findActiveByInvestment.mockResolvedValue(plan({ id: 8 }));

      await expect(service.update('7', { status: 'active' } as never)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns null when the plan does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('404', {} as never)).resolves.toBeNull();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows the current active plan while excluding its own ID from conflict checks', async () => {
      repository.findOne.mockResolvedValue(plan());
      repository.findActiveByInvestment.mockResolvedValue(plan());
      repository.update.mockResolvedValue(plan({ amount: 150 }));

      await expect(service.update('7', { status: ' ACTIVE ', amount: 150 } as never)).resolves.toMatchObject({
        amount: 150,
      });
      expect(repository.findActiveByInvestment).toHaveBeenCalledWith('11');
      expect(repository.update).toHaveBeenCalledWith('7', { status: ' ACTIVE ', amount: 150 }, undefined);
    });

    it('rejects updates that target an investment the user cannot modify', async () => {
      repository.findOne.mockResolvedValue(plan());
      investmentRepository.findOne.mockResolvedValueOnce(openInvestment()).mockResolvedValueOnce(null);

      await expect(service.update('7', { investmentId: 12 } as never, 42)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a plan without fetching it when no user context is supplied', async () => {
      await service.remove('7');

      expect(repository.delete).toHaveBeenCalledWith('7');
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('does nothing when an owned plan is missing', async () => {
      repository.findOne.mockResolvedValue(null);

      await service.remove('404', 42);

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting a plan attached to a closed investment', async () => {
      repository.findOne.mockResolvedValue(plan());
      investmentRepository.findOne.mockResolvedValue({ ...openInvestment(), status: ' CLOSED ' });

      await expect(service.remove('7', 42)).rejects.toThrow(BadRequestException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('skipCurrentContribution', () => {
    it('records the skipped due date and schedules the next occurrence', async () => {
      const currentPlan = plan({ nextDueDate: new Date('2026-02-01T00:00:00.000Z') });
      repository.findOne.mockResolvedValue(currentPlan);
      repository.skipCurrentContribution.mockResolvedValue({});
      scheduleCalculator.firstDueDateOnOrAfter.mockReturnValue(
        new Date('2026-03-01T00:00:00.000Z'),
      );

      await service.skipCurrentContribution('11', '7', 42, { notes: 'Travel' });

      expect(repository.skipCurrentContribution).toHaveBeenCalledWith({
        investmentId: '11',
        planId: '7',
        userId: 42,
        dueDate: '2026-02-01',
        nextDueDate: '2026-03-01',
        notes: 'Travel',
      });
    });

    it('rejects skipping when the plan has no due contribution', async () => {
      repository.findOne.mockResolvedValue(plan({ nextDueDate: null }));

      await expect(
        service.skipCurrentContribution('11', '7', 42, {} as never),
      ).rejects.toThrow('Recurring plan does not have a due contribution to skip');
      expect(repository.skipCurrentContribution).not.toHaveBeenCalled();
    });

    it('rejects a plan associated with another investment', async () => {
      repository.findOne.mockResolvedValue(plan({ investmentId: 12 }));

      await expect(service.skipCurrentContribution('11', '7', 42, {} as never)).rejects.toThrow(
        'Recurring plan not found',
      );
      expect(repository.skipCurrentContribution).not.toHaveBeenCalled();
    });

    it('maps repository not-found and other failures to domain exceptions', async () => {
      repository.findOne.mockResolvedValue(plan());
      repository.skipCurrentContribution.mockRejectedValueOnce(new Error('Investment not found'));

      await expect(service.skipCurrentContribution('11', '7', 42, {} as never)).rejects.toThrow(NotFoundException);

      repository.skipCurrentContribution.mockRejectedValueOnce(new Error('write failed'));
      await expect(service.skipCurrentContribution('11', '7', 42, {} as never)).rejects.toThrow(BadRequestException);
    });
  });

  describe('advanceNextDueDate', () => {
    it('stores the next calculated occurrence for an active plan', async () => {
      repository.findOne.mockResolvedValue(plan());
      repository.update.mockResolvedValue(plan({ nextDueDate: new Date('2026-06-01T00:00:00.000Z') }));

      await service.advanceNextDueDate(7);

      expect(repository.update).toHaveBeenCalledWith('7', {
        nextDueDate: '2026-06-01',
      }, undefined);
    });

    it('does not advance a paused plan', async () => {
      repository.findOne.mockResolvedValue(plan({ status: 'paused' }));

      await expect(service.advanceNextDueDate(7)).rejects.toThrow(
        'Paused recurring plans cannot advance due dates',
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns null for a missing plan and clears the due date after the schedule ends', async () => {
      repository.findOne.mockResolvedValueOnce(null);
      await expect(service.advanceNextDueDate(404)).resolves.toBeNull();

      repository.findOne.mockResolvedValueOnce(plan({ endDate: new Date('2026-02-01T00:00:00.000Z') }));
      scheduleCalculator.firstDueDateOnOrAfter.mockReturnValue(null);
      repository.update.mockResolvedValue(plan({ nextDueDate: null }));

      await service.advanceNextDueDate(7);

      expect(repository.update).toHaveBeenCalledWith('7', { nextDueDate: null }, undefined);
    });
  });

  describe('generateDueRecurringInvestmentEvents', () => {
    it('forwards the cutoff date to the repository', async () => {
      const cutoffDate = new Date('2026-06-01T00:00:00.000Z');
      repository.generateDueRecurringInvestmentEvents.mockResolvedValue({ processedPlans: 2, generatedEvents: 4 });

      await expect(service.generateDueRecurringInvestmentEvents(cutoffDate)).resolves.toEqual({
        processedPlans: 2,
        generatedEvents: 4,
      });
      expect(repository.generateDueRecurringInvestmentEvents).toHaveBeenCalledWith({ cutoffDate });
    });
  });
});