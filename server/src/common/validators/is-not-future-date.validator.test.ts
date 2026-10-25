import { validateSync } from 'class-validator';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IsNotFutureDate } from './is-not-future-date.validator';

class DateInput {
  @IsNotFutureDate()
  date: unknown;
}

describe('IsNotFutureDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts dates before today and the current calendar day', () => {
    const now = new Date(2026, 9, 25, 12);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const today = new Date(2026, 9, 25, 15).toISOString();
    const past = new Date(2026, 9, 24, 15).toISOString();

    expect(validateSync(Object.assign(new DateInput(), { date: today }))).toEqual([]);
    expect(validateSync(Object.assign(new DateInput(), { date: past }))).toEqual([]);
  });

  it('rejects a date after today with the validator message', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 25, 12));

    const errors = validateSync(Object.assign(new DateInput(), { date: '2099-01-01' }));

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({ isNotFutureDate: 'date cannot be in the future' });
  });

  it.each(['', 'not-a-date', 123, null, undefined])(
    'rejects blank, malformed, or non-string date values: %s',
    (date) => {
      const errors = validateSync(Object.assign(new DateInput(), { date }));

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isNotFutureDate');
    },
  );
});