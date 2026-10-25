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
  });
});