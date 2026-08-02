import { BadRequestException, Injectable } from '@nestjs/common';

export type RecurringCadenceUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

@Injectable()
export class RecurringScheduleCalculator {
  private readonly DAY_MS = 24 * 60 * 60 * 1000;

  calculateDueDates(params: {
    anchorDate: string | Date;
    cadenceUnit: RecurringCadenceUnit;
    cadenceInterval: number;
    cutoffDate: string | Date;
    endDate?: string | Date | null;
  }): Date[] {
    const { anchorDate, cadenceUnit, cadenceInterval, cutoffDate, endDate } = params;

    if (!Number.isInteger(cadenceInterval) || cadenceInterval < 1) {
      throw new BadRequestException('cadenceInterval must be an integer greater than 0');
    }

    const anchor = this.toUtcDateOnly(anchorDate);
    const cutoff = this.toUtcDateOnly(cutoffDate);
    const upperBound = endDate ? this.minDate(cutoff, this.toUtcDateOnly(endDate)) : cutoff;

    if (upperBound < anchor) return [];

    const dates: Date[] = [];
    let cursor = new Date(anchor.getTime());

    while (cursor <= upperBound) {
      dates.push(new Date(cursor.getTime()));
      cursor = this.advance(cursor, cadenceUnit, cadenceInterval, anchor.getUTCDate());
    }

    return dates;
  }

  firstDueDateOnOrAfter(params: {
    anchorDate: string | Date;
    cadenceUnit: RecurringCadenceUnit;
    cadenceInterval: number;
    referenceDate: string | Date;
    endDate?: string | Date | null;
  }): Date | null {
    const { anchorDate, cadenceUnit, cadenceInterval, referenceDate, endDate } = params;
    if (!Number.isInteger(cadenceInterval) || cadenceInterval < 1) {
      throw new BadRequestException('cadenceInterval must be an integer greater than 0');
    }

    const anchor = this.toUtcDateOnly(anchorDate);
    const ref = this.toUtcDateOnly(referenceDate);
    const end = endDate ? this.toUtcDateOnly(endDate) : null;

    let cursor = new Date(anchor.getTime());
    while (cursor < ref) {
      cursor = this.advance(cursor, cadenceUnit, cadenceInterval, anchor.getUTCDate());
      if (end && cursor > end) return null;
    }

    if (end && cursor > end) return null;
    return cursor;
  }

  private toUtcDateOnly(value: string | Date): Date {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid date value');
    }

    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private advance(date: Date, unit: RecurringCadenceUnit, interval: number, anchorDay: number): Date {
    if (unit === 'day') return new Date(date.getTime() + interval * this.DAY_MS);
    if (unit === 'week') return new Date(date.getTime() + interval * 7 * this.DAY_MS);

    const monthStep = unit === 'month' ? interval : unit === 'quarter' ? interval * 3 : interval * 12;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + monthStep;

    const targetYear = year + Math.floor(month / 12);
    const targetMonth = ((month % 12) + 12) % 12;

    const maxDay = this.daysInMonth(targetYear, targetMonth);
    const safeDay = Math.min(anchorDay, maxDay);

    return new Date(Date.UTC(targetYear, targetMonth, safeDay));
  }

  private daysInMonth(year: number, monthZeroBased: number): number {
    return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
  }

  private minDate(left: Date, right: Date): Date {
    return left <= right ? left : right;
  }
}
