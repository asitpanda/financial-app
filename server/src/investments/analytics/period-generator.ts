import type { AnalyticsPeriod, AnalyticsQuery } from './analytics.types';

const dayStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const getFiscalYearStart = (date: Date, fiscalYearStartMonth: number) => {
  const year = date.getUTCMonth() >= fiscalYearStartMonth ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, fiscalYearStartMonth, 1));
};

export const generatePeriods = (dates: Date[], query: AnalyticsQuery, now = new Date()): AnalyticsPeriod[] => {
  const availableFrom = query.from ?? (dates.length ? dates.reduce((min, date) => date < min ? date : min, dates[0]) : now);
  const monthly = query.granularity === 'MONTH';
  const firstStart = monthly ? new Date(Date.UTC(availableFrom.getUTCFullYear(), availableFrom.getUTCMonth(), 1)) : getFiscalYearStart(availableFrom, query.fiscalYearStartMonth);
  const lastDate = query.to ?? now;
  const periods: AnalyticsPeriod[] = [];
  for (let start = firstStart; start <= lastDate; start = new Date(Date.UTC(start.getUTCFullYear() + (monthly ? 0 : 1), start.getUTCMonth() + (monthly ? 1 : 0), 1))) {
    const end = new Date(Date.UTC(start.getUTCFullYear() + (monthly ? 0 : 1), start.getUTCMonth() + (monthly ? 1 : 0), 0, 23, 59, 59, 999));
    periods.push({
      key: monthly ? `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}` : String(start.getUTCFullYear()),
      label: monthly ? start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : `FY ${start.getUTCFullYear()}-${String(start.getUTCFullYear() + 1).slice(-2)}`,
      startDate: dayStart(start),
      endDate: end > lastDate ? lastDate : end,
    });
  }
  return periods;
};