import { describe, expect, it } from 'vitest';
import { generatePeriods, getFiscalYearStart } from './period-generator';

describe('period-generator', () => {
  describe('getFiscalYearStart', () => {
    it('starts in the current year when the date is on the fiscal-year boundary', () => {
      expect(getFiscalYearStart(new Date('2026-04-01T12:00:00.000Z'), 3)).toEqual(
        new Date('2026-04-01T00:00:00.000Z'),
      );
    });

    it('starts in the previous year when the date is before the fiscal-year boundary', () => {
      expect(getFiscalYearStart(new Date('2026-03-31T23:59:59.999Z'), 3)).toEqual(
        new Date('2025-04-01T00:00:00.000Z'),
      );
    });
  });

  describe('generatePeriods', () => {
    it('generates monthly periods from the earliest activity date and caps the final period at query end', () => {
      const periods = generatePeriods(
        [new Date('2026-02-10T00:00:00.000Z'), new Date('2026-01-20T00:00:00.000Z')],
        {
          range: 'ALL',
          granularity: 'MONTH',
          calendar: 'FISCAL',
          fiscalYearStartMonth: 3,
          to: new Date('2026-03-10T12:00:00.000Z'),
        },
        new Date('2030-01-01T00:00:00.000Z'),
      );

      expect(periods.map(({ key }) => key)).toEqual(['2026-01', '2026-02', '2026-03']);
      expect(periods[0].startDate).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(periods[0].endDate).toEqual(new Date('2026-01-31T23:59:59.999Z'));
      expect(periods[2].startDate).toEqual(new Date('2026-03-01T00:00:00.000Z'));
      expect(periods[2].endDate).toEqual(new Date('2026-03-10T12:00:00.000Z'));
    });

    it('uses the explicit start date instead of activity dates', () => {
      const periods = generatePeriods(
        [new Date('2025-10-15T00:00:00.000Z')],
        {
          range: 'ALL',
          granularity: 'MONTH',
          calendar: 'FISCAL',
          fiscalYearStartMonth: 3,
          from: new Date('2025-12-15T00:00:00.000Z'),
          to: new Date('2026-01-15T00:00:00.000Z'),
        },
        new Date('2030-01-01T00:00:00.000Z'),
      );

      expect(periods.map(({ key }) => key)).toEqual(['2025-12', '2026-01']);
      expect(periods[0].startDate).toEqual(new Date('2025-12-01T00:00:00.000Z'));
    });

    it('generates fiscal-year periods and caps the final period at query end', () => {
      const periods = generatePeriods(
        [],
        {
          range: 'ALL',
          granularity: 'YEAR',
          calendar: 'FISCAL',
          fiscalYearStartMonth: 3,
          from: new Date('2025-03-20T00:00:00.000Z'),
          to: new Date('2026-01-15T12:00:00.000Z'),
        },
        new Date('2030-01-01T00:00:00.000Z'),
      );

      expect(periods.map(({ key, label }) => [key, label])).toEqual([
        ['2024', 'FY 2024-25'],
        ['2025', 'FY 2025-26'],
      ]);
      expect(periods[0].startDate).toEqual(new Date('2024-04-01T00:00:00.000Z'));
      expect(periods[0].endDate).toEqual(new Date('2025-03-31T23:59:59.999Z'));
      expect(periods[1].endDate).toEqual(new Date('2026-01-15T12:00:00.000Z'));
    });

    it('uses now as the range when no activity dates or query bounds are provided', () => {
      const now = new Date('2026-08-16T14:30:00.000Z');
      const periods = generatePeriods(
        [],
        { range: 'ALL', granularity: 'MONTH', calendar: 'FISCAL', fiscalYearStartMonth: 3 },
        now,
      );

      expect(periods).toHaveLength(1);
      expect(periods[0].key).toBe('2026-08');
      expect(periods[0].startDate).toEqual(new Date('2026-08-01T00:00:00.000Z'));
      expect(periods[0].endDate).toEqual(now);
    });

    it('returns no periods when the start date is after the end date', () => {
      const periods = generatePeriods(
        [],
        {
          range: 'ALL',
          granularity: 'MONTH',
          calendar: 'FISCAL',
          fiscalYearStartMonth: 3,
          from: new Date('2026-04-01T00:00:00.000Z'),
          to: new Date('2026-03-31T23:59:59.999Z'),
        },
      );

      expect(periods).toEqual([]);
    });
  });
});