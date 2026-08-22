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

// Master mode for the header's global date filter: show everything, use the fiscal
// period picker below, or use an explicit custom range.
export type GlobalDateScopeMode = 'tillNow' | 'fiscal' | 'range';

export interface GlobalDateFilterState {
  scopeMode: GlobalDateScopeMode;
  mode: PageDateFilterMode;
  selectedYear: number;
  selectedMonth: number;
  rangeStart: string | null;
  rangeEnd: string | null;
}

export const matchesGlobalDateFilter = (date: Date, state: GlobalDateFilterState) => {
  if (state.scopeMode === 'tillNow') return true;

  if (state.scopeMode === 'range') {
    if (!state.rangeStart || !state.rangeEnd) return false;
    const start = new Date(state.rangeStart);
    const end = new Date(state.rangeEnd);
    return date >= start && date <= end;
  }

  return matchesPageDateFilter(date, state.mode, state.selectedYear, state.selectedMonth);
};

const currentDate = new Date();
const currentFiscalYearStart = getFiscalYearStart(currentDate);

interface PageDateFilterState {
  scopeMode: GlobalDateScopeMode;
  mode: PageDateFilterMode;
  selectedYear: number;
  selectedMonth: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  setScopeMode: (scopeMode: GlobalDateScopeMode) => void;
  setMode: (mode: PageDateFilterMode) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  setRangeStart: (rangeStart: string | null) => void;
  setRangeEnd: (rangeEnd: string | null) => void;
}

export const usePageDateFilterStore = create<PageDateFilterState>((set) => ({
  scopeMode: 'fiscal',
  mode: 'monthly',
  selectedYear: currentFiscalYearStart,
  selectedMonth: currentDate.getMonth(),
  rangeStart: null,
  rangeEnd: null,
  setScopeMode: (scopeMode) => set({ scopeMode }),
  setMode: (mode) => set({ mode }),
  setSelectedYear: (selectedYear) => set({ selectedYear }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
  setRangeStart: (rangeStart) => set({ rangeStart }),
  setRangeEnd: (rangeEnd) => set({ rangeEnd }),
}));
