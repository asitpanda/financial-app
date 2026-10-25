import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecurringScheduleCalculator } from './recurring-schedule-calculator.service';

function dates(values: Date[]) {
  return values.map((value) => value.toISOString().slice(0, 10));
}

describe('RecurringScheduleCalculator', () => {
  let calculator: RecurringScheduleCalculator;

  beforeEach(() => {
    calculator = new RecurringScheduleCalculator();
  });

  describe('calculateDueDates', () => {
    it('keeps the anchor day when a monthly occurrence falls in a shorter month', () => {
      const result = calculator.calculateDueDates({
        anchorDate: '2026-01-31',
        cadenceUnit: 'month',
        cadenceInterval: 1,
        cutoffDate: '2026-05-01',
      });

      expect(dates(result)).toEqual([
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
      ]);
    });

    it.each([
      ['day', '2026-03-02'],
      ['week', '2026-03-15'],
      ['quarter', '2026-06-01'],
      ['year', '2027-03-01'],
    ] as const)('advances a %s cadence by one interval', (cadenceUnit, expectedDate) => {
      const result = calculator.calculateDueDates({
        anchorDate: '2026-03-01',
        cadenceUnit,
        cadenceInterval: cadenceUnit === 'week' ? 2 : 1,
        cutoffDate: expectedDate,
      });

      expect(dates(result)).toEqual(['2026-03-01', expectedDate]);
    });

    it('includes occurrences through the earlier of the cutoff and plan end date', () => {
      const result = calculator.calculateDueDates({
        anchorDate: '2026-01-01',
        cadenceUnit: 'day',
        cadenceInterval: 1,
        cutoffDate: '2026-01-05',
        endDate: '2026-01-03',
      });

      expect(dates(result)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    });

    it('returns no dates when the plan ends before its anchor', () => {
      expect(
        calculator.calculateDueDates({
          anchorDate: '2026-01-04',
          cadenceUnit: 'day',
          cadenceInterval: 1,
          cutoffDate: '2026-01-10',
          endDate: '2026-01-03',
        }),
      ).toEqual([]);
    });

    it.each([0, -1, 1.5])('rejects cadence interval %s', (cadenceInterval) => {
      expect(() =>
        calculator.calculateDueDates({
          anchorDate: '2026-01-01',
          cadenceUnit: 'day',
          cadenceInterval,
          cutoffDate: '2026-01-10',
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects malformed date inputs', () => {
      expect(() =>
        calculator.calculateDueDates({
          anchorDate: 'not-a-date',
          cadenceUnit: 'day',
          cadenceInterval: 1,
          cutoffDate: '2026-01-10',
        }),
      ).toThrow('Invalid date value');
    });
  });

  describe('firstDueDateOnOrAfter', () => {
    it('returns the first occurrence on or after the reference date', () => {
      const result = calculator.firstDueDateOnOrAfter({
        anchorDate: '2026-01-31',
        cadenceUnit: 'month',
        cadenceInterval: 1,
        referenceDate: '2026-03-01',
      });

      expect(result?.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    });

    it('returns null when the next occurrence would be after the plan end date', () => {
      const result = calculator.firstDueDateOnOrAfter({
        anchorDate: '2026-01-01',
        cadenceUnit: 'week',
        cadenceInterval: 1,
        referenceDate: '2026-01-15',
        endDate: '2026-01-14',
      });

      expect(result).toBeNull();
    });

    it('returns the anchor date when it falls on the reference date', () => {
      const result = calculator.firstDueDateOnOrAfter({
        anchorDate: '2026-01-01',
        cadenceUnit: 'day',
        cadenceInterval: 1,
        referenceDate: '2026-01-01',
      });

      expect(result?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });
  });
});