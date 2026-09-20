import type { AnalyticsPeriod, AnalyticsQuery } from './analytics.types';

const dayStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const getFiscalYearStart = (date: Date, fiscalYearStartMonth: number) => {
  const year = date.getUTCMonth() >= fiscalYearStartMonth ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, fiscalYearStartMonth, 1));
};

export const generatePeriods = (dates: Date[], query: AnalyticsQuery, now = new Date()): AnalyticsPeriod[] => {
  const availableFrom = dates.length ? dates.reduce((min, date) => date < min ? date : min, dates[0]) : now;
  const firstStart = getFiscalYearStart(availableFrom, query.fiscalYearStartMonth);
  const lastStart = getFiscalYearStart(query.to ?? now, query.fiscalYearStartMonth);
  const periods: AnalyticsPeriod[] = [];
  for (let start = firstStart; start <= lastStart; start = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), 1))) {
    const end = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), 0, 23, 59, 59, 999));
    periods.push({
      key: String(start.getUTCFullYear()),
      label: `FY ${start.getUTCFullYear()}-${String(start.getUTCFullYear() + 1).slice(-2)}`,
      startDate: dayStart(start),
      endDate: end > (query.to ?? now) ? query.to ?? now : end,
    });
  }
  return periods;
};