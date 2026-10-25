import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseOptionalDateInput, parseRequiredDateInput } from './date-input';

describe('date-input', () => {
  describe('parseRequiredDateInput', () => {
    it('parses supported date input into a Date', () => {
      expect(parseRequiredDateInput('2026-10-25T12:30:00.000Z', 'startDate')).toEqual(
        new Date('2026-10-25T12:30:00.000Z'),
      );
    });

    it('returns a copy when the input is already a Date', () => {
      const input = new Date('2026-10-25T12:30:00.000Z');
      const parsed = parseRequiredDateInput(input, 'startDate');

      expect(parsed).toEqual(input);
      expect(parsed).not.toBe(input);
    });

    it.each([undefined, null, ''])('rejects a missing required date: %s', (value) => {
      expect(() => parseRequiredDateInput(value, 'startDate')).toThrow(
        new BadRequestException({ field: 'startDate', message: 'Missing startDate.' }),
      );
    });

    it('rejects an invalid date with the field name in the error response', () => {
      try {
        parseRequiredDateInput('not-a-date', 'startDate');
        throw new Error('Expected date parsing to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toEqual({
          field: 'startDate',
          message:
            'Invalid startDate: expected an ISO-8601 date or YYYY-MM-DD value. Received not-a-date.',
        });
      }
    });
  });

  describe('parseOptionalDateInput', () => {
    it.each([undefined, null, ''])('returns null when the optional date is omitted: %s', (value) => {
      expect(parseOptionalDateInput(value, 'endDate')).toBeNull();
    });

    it('parses a supplied date using the required-date contract', () => {
      expect(parseOptionalDateInput('2026-10-25', 'endDate')).toEqual(new Date('2026-10-25'));
    });

    it('rejects an invalid supplied date', () => {
      expect(() => parseOptionalDateInput('invalid', 'endDate')).toThrow(BadRequestException);
    });
  });
});