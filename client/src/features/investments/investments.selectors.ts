import dayjs from 'dayjs';
import {
  formatInvestmentDate,
  getInvestmentCategoryOptions,
  normalizeInvestmentForUi,
} from '../../utils/investmentHelpers';
import type { Investment } from './types/investment.types';
import type { InvestmentAssetTaxonomyNode } from './types/investmentAssetTaxonomy.types';

export interface InvestmentDashboardKpis {
  totalInvestments: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalReturn: number;
  returnPercentage: number;
  upcomingMaturity: number;
  insuranceCover: number;
}

export interface InvestmentAllocationSegment {
  label: string;
  value: number;
}

export interface InvestmentSeriesPoint {
  label: string;
  invested: number;
  return: number;
  investedBreakdown: Record<string, number>;
  returnBreakdown: Record<string, number>;
}

export interface InvestmentCalendarItem {
  id: string;
  title: string;
  type: string;
  date: string;
  amount: number;
  subtitle: string;
}

export interface InvestmentContributionViewItem extends Investment {
  dueDaysUntil: number;
  dueLabel: string;
  dueTone: 'error' | 'warning' | 'default';
}

export interface InvestmentFilterInput {
  search: string;
  statusFilter: string;
  categoryFilter: string;
}

export type InvestmentCalendarGroups = Record<string, InvestmentCalendarItem[]>;

const FISCAL_YEAR_START_MONTH = 3;
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const isWithinDays = (value: string | null | undefined, days: number) => {
  if (!value) return false;

  const parsed = dayjs(value).startOf('day');
  const today = dayjs().startOf('day');

  return (
    parsed.isAfter(today.subtract(1, 'day')) &&
    parsed.isBefore(today.add(days + 1, 'day'))
  );
};

export const getInvestmentDashboardKpis = (
  investments: Investment[],
): InvestmentDashboardKpis => {
  const totalInvested = investments.reduce(
    (sum, item) => sum + Number(item.totalInvested || 0),
    0,
  );

  const totalCurrentValue = investments.reduce(
    (sum, item) => sum + Number(item.currentValue || item.totalInvested || 0),
    0,
  );

  const totalReturn = totalCurrentValue - totalInvested;
  const returnPercentage =
    totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const upcomingMaturity = investments
    .filter(
      (item) =>
        item.status === 'active' && isWithinDays(item.maturityDate, 90),
    )
    .reduce(
      (sum, item) => sum + Number(item.currentValue || item.totalInvested || 0),
      0,
    );

  const insuranceCover = investments
    .filter((item) => item.category === 'insurance' && item.status === 'active')
    .reduce((sum, item) => sum + Number(item.insuranceCover || 0), 0);

  return {
    totalInvestments: investments.length,
    totalInvested,
    totalCurrentValue,
    totalReturn,
    returnPercentage,
    upcomingMaturity,
    insuranceCover,
  };
};

export const getInvestmentCategoryBreakdown = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
): InvestmentAllocationSegment[] => {
  const totals = investments.reduce<Record<string, number>>((acc, item) => {
    const category = item.category || 'other';
    acc[category] = (acc[category] || 0) + Number(item.totalInvested || 0);
    return acc;
  }, {});

  return getInvestmentCategoryOptions(taxonomyNodes as never[])
    .filter((option) => option.value !== 'all')
    .map((option) => ({
      label: option.label,
      value: totals[option.value] || 0,
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
};

export const getInvestmentCategoryLabelMap = (
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
): Record<string, string> => {
  const map: Record<string, string> = {};

  getInvestmentCategoryOptions(taxonomyNodes as never[])
    .filter((option) => option.value !== 'all')
    .forEach((option) => {
      map[option.value] = option.label;
    });

  return map;
};

export const getFilteredInvestments = (
  investments: Investment[],
  { search, statusFilter, categoryFilter }: InvestmentFilterInput,
) => {
  const query = search.trim().toLowerCase();

  return investments.filter((investment) => {
    const matchesSearch =
      !query ||
      [investment.name, investment.type, investment.institution, investment.referenceNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'all' || investment.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || investment.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });
};

export const getNormalizedInvestments = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
) => investments.map((item) => normalizeInvestmentForUi(item, taxonomyNodes as never[]));

export const getTopInvestmentCurrentValueItems = (
  investments: Investment[],
  limit = 5,
) => {
  return [...investments]
    .sort(
      (left, right) =>
        Number(right.currentValue || right.totalInvested || 0) -
        Number(left.currentValue || left.totalInvested || 0),
    )
    .slice(0, limit);
};

export const getUpcomingMaturityItems = (
  investments: Investment[],
  limit = 5,
) => {
  return [...investments]
    .filter((item) => item.status === 'active' && item.maturityDate)
    .sort(
      (left, right) =>
        dayjs(left.maturityDate).valueOf() - dayjs(right.maturityDate).valueOf(),
    )
    .slice(0, limit);
};

export const getRecentInvestments = (
  investments: Investment[],
  limit = 5,
) => {
  return [...investments]
    .sort(
      (left, right) =>
        dayjs(right.createdAt || right.startDate).valueOf() -
        dayjs(left.createdAt || left.startDate).valueOf(),
    )
    .slice(0, limit);
};

export const getInvestmentContributionViewItems = (
  investments: Investment[],
  limit = 6,
): InvestmentContributionViewItem[] => {
  const todayStart = dayjs().startOf('day').valueOf();

  return [...investments]
    .filter(
      (item) =>
        item.status === 'active' && item.activeContributionPlan?.nextDueDate,
    )
    .map((item) => ({
      item,
      dueDate: item.activeContributionPlan!.nextDueDate!,
    }))
    .sort((left, right) => {
      return (
        dayjs(left.dueDate).valueOf() - dayjs(right.dueDate).valueOf()
      );
    })
    .slice(0, limit)
    .map(({ item, dueDate }) => {
      const dueDaysUntil = dueDate
        ? Math.floor((new Date(dueDate).getTime() - todayStart) / 86400000)
        : 0;
      const dueTone: InvestmentContributionViewItem['dueTone'] =
        dueDaysUntil < 0 ? 'error' : dueDaysUntil <= 7 ? 'warning' : 'default';

      return {
        ...item,
        dueDaysUntil,
        dueTone,
        dueLabel:
          dueTone === 'error'
            ? 'Overdue'
            : dueTone === 'warning'
              ? `In ${dueDaysUntil}d`
              : dueDate
                ? formatInvestmentDate(dueDate)
                : 'Not set',
      };
    });
};

export const getInvestmentSelectedById = (
  investments: Investment[],
  selectedInvestmentId: string | number | null,
) => investments.find((item) => item.id === selectedInvestmentId) || null;

export const getInvestmentTimeSeriesData = (
  investments: Investment[],
  selectedYearForDrill: string | null,
) => {
  return selectedYearForDrill
    ? getInvestmentMonthlyTimeSeriesData(investments, selectedYearForDrill)
    : getInvestmentYearlyTimeSeriesData(investments);
};

export const getInvestmentYearlyTimeSeriesData = (
  investments: Investment[],
): InvestmentSeriesPoint[] => {
  if (investments.length === 0) return [];

  const yearGroups: Record<string, InvestmentSeriesPoint> = {};

  investments.forEach((investment) => {
    const startDate = investment.startDate ? new Date(investment.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) return;

    const month = startDate.getMonth();
    const year = startDate.getFullYear();
    const fiscalYear = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;
    const fiscalYearLabel = `FY ${fiscalYear}-${String(fiscalYear + 1).slice(-2)}`;

    if (!yearGroups[fiscalYearLabel]) {
      yearGroups[fiscalYearLabel] = {
        label: fiscalYearLabel,
        invested: 0,
        return: 0,
        investedBreakdown: {},
        returnBreakdown: {},
      };
    }

    const investedAmount = Number(investment.totalInvested || 0);
    const currentAmount = Number(investment.currentValue || investment.totalInvested || 0);
    const returnAmount = currentAmount - investedAmount;

    yearGroups[fiscalYearLabel].invested += investedAmount;
    yearGroups[fiscalYearLabel].return += returnAmount;

    const category = investment.category || 'other';
    yearGroups[fiscalYearLabel].investedBreakdown[category] =
      (yearGroups[fiscalYearLabel].investedBreakdown[category] || 0) + investedAmount;
    yearGroups[fiscalYearLabel].returnBreakdown[category] =
      (yearGroups[fiscalYearLabel].returnBreakdown[category] || 0) + returnAmount;
  });

  return Object.values(yearGroups).sort((left, right) => {
    const leftYear = parseInt(left.label.split(' ')[1].split('-')[0]);
    const rightYear = parseInt(right.label.split(' ')[1].split('-')[0]);
    return leftYear - rightYear;
  });
};

export const getInvestmentMonthlyTimeSeriesData = (
  investments: Investment[],
  selectedYearForDrill: string | null,
): InvestmentSeriesPoint[] => {
  if (!selectedYearForDrill || investments.length === 0) return [];

  const yearMatch = selectedYearForDrill.match(/FY (\d+)-(\d+)/);
  if (!yearMatch) return [];

  const startYear = parseInt(yearMatch[1]);
  const monthGroups: Record<string, InvestmentSeriesPoint> = {};

  for (let index = 0; index < 12; index++) {
    const actualMonth = (FISCAL_YEAR_START_MONTH + index) % 12;
    const actualYear = startYear + Math.floor((FISCAL_YEAR_START_MONTH + index) / 12);
    const monthKey = `${MONTH_NAMES[actualMonth]} ${actualYear}`;

    monthGroups[monthKey] = {
      label: monthKey,
      invested: 0,
      return: 0,
      investedBreakdown: {},
      returnBreakdown: {},
    };
  }

  investments.forEach((investment) => {
    const startDate = investment.startDate ? new Date(investment.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) return;

    const month = startDate.getMonth();
    const year = startDate.getFullYear();
    const fiscalYear = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;

    if (fiscalYear !== startYear) return;

    const monthKey = `${MONTH_NAMES[month]} ${year}`;
    if (monthKey in monthGroups) {
      const investedAmount = Number(investment.totalInvested || 0);
      const currentAmount = Number(investment.currentValue || investment.totalInvested || 0);
      const returnAmount = currentAmount - investedAmount;

      monthGroups[monthKey].invested += investedAmount;
      monthGroups[monthKey].return += returnAmount;

      const category = investment.category || 'other';
      monthGroups[monthKey].investedBreakdown[category] =
        (monthGroups[monthKey].investedBreakdown[category] || 0) + investedAmount;
      monthGroups[monthKey].returnBreakdown[category] =
        (monthGroups[monthKey].returnBreakdown[category] || 0) + returnAmount;
    }
  });

  return Object.values(monthGroups).filter(
    (monthGroup) => monthGroup.invested > 0 || monthGroup.return !== 0,
  );
};

export const getInvestmentCalendarGroups = (
  investments: Investment[],
): InvestmentCalendarGroups => {
  const calendarItems = investments
    .flatMap((investment) => {
      const items: InvestmentCalendarItem[] = [];

      if (investment.maturityDate) {
        items.push({
          id: `${investment.id}-maturity`,
          title: investment.name,
          type: 'Maturity',
          date: investment.maturityDate,
          amount: investment.currentValue || investment.totalInvested,
          subtitle: `${investment.institution} • ${investment.type}`,
        });
      }

      if (investment.activeContributionPlan?.nextDueDate) {
        items.push({
          id: `${investment.id}-contribution`,
          title: investment.name,
          type: 'Contribution Due',
          date: investment.activeContributionPlan.nextDueDate,
          amount: investment.activeContributionPlan.amount,
          subtitle: `${investment.institution} • ${investment.activeContributionPlan.cadenceInterval > 1 ? `every ${investment.activeContributionPlan.cadenceInterval} ` : ''}${investment.activeContributionPlan.cadenceUnit}`,
        });
      }

      return items;
    })
    .filter((item) => dayjs(item.date).isAfter(dayjs().subtract(1, 'day')))
    .sort((left, right) => dayjs(left.date).valueOf() - dayjs(right.date).valueOf());

  return calendarItems.reduce<InvestmentCalendarGroups>((acc, item) => {
    const key = dayjs(item.date).format('MMMM YYYY');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};
