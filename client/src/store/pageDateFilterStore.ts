import { create } from 'zustand';

export type PageDateFilterMode = 'monthly' | 'yearly';

export const FISCAL_YEAR_START_MONTH = 3;
export const FISCAL_MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
export const PAGE_MONTH_OPTIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const getFiscalYearStart = (date: Date) =>
  date.getMonth() >= FISCAL_YEAR_START_MONTH ? date.getFullYear() : date.getFullYear() - 1;

export const resolveFiscalMonthYear = (fiscalYearStart: number, monthIndex: number) => {
  const year = monthIndex >= FISCAL_YEAR_START_MONTH ? fiscalYearStart : fiscalYearStart + 1;
  return { year, month: monthIndex };
};

export const matchesPageDateFilter = (
  date: Date,
  mode: PageDateFilterMode,
  selectedYear: number,
  selectedMonth: number
) => {
  if (mode === 'monthly') {
    const resolved = resolveFiscalMonthYear(selectedYear, selectedMonth);
    return date.getFullYear() === resolved.year && date.getMonth() === resolved.month;
  }

  return getFiscalYearStart(date) === selectedYear;
};

const currentDate = new Date();
const currentFiscalYearStart = getFiscalYearStart(currentDate);

interface PageDateFilterState {
  mode: PageDateFilterMode;
  selectedYear: number;
  selectedMonth: number;
  setMode: (mode: PageDateFilterMode) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
}

export const usePageDateFilterStore = create<PageDateFilterState>((set) => ({
  mode: 'monthly',
  selectedYear: currentFiscalYearStart,
  selectedMonth: currentDate.getMonth(),
  setMode: (mode) => set({ mode }),
  setSelectedYear: (selectedYear) => set({ selectedYear }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
}));
