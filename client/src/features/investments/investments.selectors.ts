import dayjs from 'dayjs';
import {
  formatInvestmentDate,
  getInvestmentCategoryOptions,
  normalizeInvestmentForUi,
} from '../../utils/investmentHelpers';
import type { Investment } from './types/investment.types';
import type { InvestmentAssetTaxonomyNode } from './types/investmentAssetTaxonomy.types';

type InvestmentId = Investment['id'];

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
  key: string;
  label: string;
  value: number;
  investmentIds: InvestmentId[];
}

export interface InvestmentSeriesPoint {
  label: string;
  invested: number;
  return: number;
  investedBreakdown: Record<string, number>;
  returnBreakdown: Record<string, number>;
}

export interface InvestmentPortfolioGrowthPoint {
  label: string;
  investedToDate: number;
  currentValueToDate: number;
  returnToDate: number;
  snapshotBackedValue: number;
  estimatedValue: number;
  investedOnlyValue: number;
}

export interface InvestmentValueSourceSummary {
  snapshotBackedValue: number;
  estimatedValue: number;
  investedOnlyValue: number;
  snapshotBackedCount: number;
  estimatedCount: number;
  investedOnlyCount: number;
  staleValuationCount: number;
  staleValuationValue: number;
  snapshotBackedIds: InvestmentId[];
  estimatedIds: InvestmentId[];
  investedOnlyIds: InvestmentId[];
  staleValuationIds: InvestmentId[];
}

export interface InvestmentCategoryPerformanceRow {
  key: string;
  label: string;
  holdings: number;
  invested: number;
  currentValue: number;
  returnAmount: number;
  returnPercentage: number;
  sparkline: number[];
  investmentIds: InvestmentId[];
}

export interface InvestmentMaturityBucket {
  label: string;
  amount: number;
  count: number;
  investmentIds: InvestmentId[];
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

interface ResolvedInvestmentRecord {
  investment: Investment;
  id: InvestmentId;
  category: string;
  investedAmount: number;
  currentValue: number;
  returnAmount: number;
  timelineStartDate: dayjs.Dayjs;
  currentValueSource: 'snapshot' | 'estimated' | 'invested';
  isStaleValuation: boolean;
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

const STALE_VALUATION_DAYS = 90;

const getInvestmentInvestedAmount = (investment: Investment) =>
  Number(investment.totalInvested || 0);

const getInvestmentCurrentValueAtDate = (
  investment: Investment,
  pointDate = dayjs(),
) => resolveInvestmentValueAtDate(investment, pointDate).value;

const getInvestmentTimelineStartDate = (investment: Investment) => {
  const today = dayjs().startOf('month');
  const snapshotDates = Array.isArray(investment.valuationSnapshots)
    ? investment.valuationSnapshots.map((snapshot) => snapshot.snapshotDate)
    : [];
  const rawCandidates = [
    investment.startDate,
    investment.createdAt,
    investment.lastValuationAt,
    investment.activeContributionPlan?.anchorDate,
    ...snapshotDates,
  ];
  const validCandidates = rawCandidates
    .map((value) => dayjs(value).startOf('month'))
    .filter((value) => value.isValid());

  if (validCandidates.length === 0) {
    return today;
  }

  const nonFutureCandidates = validCandidates.filter(
    (value) => !value.isAfter(today, 'month'),
  );

  if (nonFutureCandidates.length === 0) {
    return today;
  }

  return nonFutureCandidates.reduce((earliest, value) =>
    value.isBefore(earliest) ? value : earliest,
  );
};

const getCategoryLabelLookup = (
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
  investments: Investment[],
) => {
  const lookup = getInvestmentCategoryOptions(taxonomyNodes as never[])
    .filter((option) => option.value !== 'all')
    .reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});

  investments.forEach((investment) => {
    const categoryKey = investment.category || 'other';
    if (!lookup[categoryKey]) {
      lookup[categoryKey] =
        categoryKey === 'other'
          ? 'Other'
          : categoryKey
              .split(/[_\s]+/)
              .filter(Boolean)
              .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
              .join(' ');
    }
  });

  return lookup;
};

const getResolvedInvestmentRecord = (
  investment: Investment,
): ResolvedInvestmentRecord => {
  const investedAmount = getInvestmentInvestedAmount(investment);
  const currentValueResolution = resolveCurrentInvestmentValueSource(investment);
  const timelineStartDate = getInvestmentTimelineStartDate(investment);

  return {
    investment,
    id: investment.id,
    category: investment.category || 'other',
    investedAmount,
    currentValue: currentValueResolution.value,
    returnAmount: currentValueResolution.value - investedAmount,
    timelineStartDate,
    currentValueSource: currentValueResolution.source,
    isStaleValuation: currentValueResolution.isStale,
  };
};

const getResolvedInvestmentRecords = (investments: Investment[]) =>
  investments.map(getResolvedInvestmentRecord);

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
  const records = getResolvedInvestmentRecords(investments);
  const totalInvested = records.reduce((sum, item) => sum + item.investedAmount, 0);
  const totalCurrentValue = records.reduce((sum, item) => sum + item.currentValue, 0);

  const totalReturn = totalCurrentValue - totalInvested;
  const returnPercentage =
    totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const upcomingMaturity = records
    .filter(
      (item) =>
        item.investment.status === 'active' &&
        isWithinDays(item.investment.maturityDate, 90),
    )
    .reduce((sum, item) => sum + item.currentValue, 0);

  const insuranceCover = records
    .filter(
      (item) => item.category === 'insurance' && item.investment.status === 'active',
    )
    .reduce((sum, item) => sum + Number(item.investment.insuranceCover || 0), 0);

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
  const records = getResolvedInvestmentRecords(investments);
  const categoryLabelLookup = getCategoryLabelLookup(taxonomyNodes, investments);
  const totals = records.reduce<
    Record<string, { value: number; investmentIds: InvestmentId[] }>
  >((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = { value: 0, investmentIds: [] };
    }

    acc[category].value += item.investedAmount;
    acc[category].investmentIds.push(item.id);
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([key, summary]) => ({
      key,
      label: categoryLabelLookup[key] || 'Other',
      value: summary.value,
      investmentIds: summary.investmentIds,
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
  const records = getResolvedInvestmentRecords(investments);

  return [...records]
    .sort(
      (left, right) => right.currentValue - left.currentValue,
    )
    .map((item) => item.investment)
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

const resolveInvestmentValueAtDate = (
  investment: Investment,
  pointDate: dayjs.Dayjs,
) => {
  const investedValue = Number(investment.totalInvested || 0);
  const snapshots = Array.isArray(investment.valuationSnapshots)
    ? [...investment.valuationSnapshots]
    : [];

  const latestSnapshot = snapshots
    .filter((snapshot) => {
      const snapshotDate = dayjs(snapshot.snapshotDate);
      return snapshotDate.isValid() && !snapshotDate.isAfter(pointDate);
    })
    .sort(
      (left, right) =>
        dayjs(right.snapshotDate).valueOf() - dayjs(left.snapshotDate).valueOf(),
    )[0];

  if (latestSnapshot) {
    return {
      value: Number(latestSnapshot.marketValue || investedValue),
      source: 'snapshot' as const,
    };
  }

  const lastValuationAt = investment.lastValuationAt
    ? dayjs(investment.lastValuationAt)
    : null;
  const currentValue = Number(investment.currentValue ?? Number.NaN);

  if (
    lastValuationAt?.isValid() &&
    !lastValuationAt.isAfter(pointDate) &&
    Number.isFinite(currentValue)
  ) {
    return {
      value: currentValue,
      source: 'estimated' as const,
    };
  }

  return {
    value: investedValue,
    source: 'invested' as const,
  };
};

const resolveCurrentInvestmentValueSource = (investment: Investment) => {
  const today = dayjs();
  const resolved = resolveInvestmentValueAtDate(investment, today);
  const lastValuationAt = investment.lastValuationAt
    ? dayjs(investment.lastValuationAt)
    : null;
  const isStale =
    !lastValuationAt?.isValid() ||
    today.diff(lastValuationAt.startOf('day'), 'day') > STALE_VALUATION_DAYS;

  return {
    ...resolved,
    isStale,
  };
};

export const getInvestmentValueSourceSummary = (
  investments: Investment[],
): InvestmentValueSourceSummary => {
  return getResolvedInvestmentRecords(investments).reduce<InvestmentValueSourceSummary>(
    (summary, item) => {
      if (item.currentValueSource === 'snapshot') {
        summary.snapshotBackedValue += item.currentValue;
        summary.snapshotBackedCount += 1;
        summary.snapshotBackedIds.push(item.id);
      } else if (item.currentValueSource === 'estimated') {
        summary.estimatedValue += item.currentValue;
        summary.estimatedCount += 1;
        summary.estimatedIds.push(item.id);
      } else {
        summary.investedOnlyValue += item.currentValue;
        summary.investedOnlyCount += 1;
        summary.investedOnlyIds.push(item.id);
      }

      if (item.investment.status === 'active' && item.isStaleValuation) {
        summary.staleValuationCount += 1;
        summary.staleValuationValue += item.currentValue;
        summary.staleValuationIds.push(item.id);
      }

      return summary;
    },
    {
      snapshotBackedValue: 0,
      estimatedValue: 0,
      investedOnlyValue: 0,
      snapshotBackedCount: 0,
      estimatedCount: 0,
      investedOnlyCount: 0,
      staleValuationCount: 0,
      staleValuationValue: 0,
      snapshotBackedIds: [],
      estimatedIds: [],
      investedOnlyIds: [],
      staleValuationIds: [],
    },
  );
};

export const getInvestmentCategoryPerformanceRows = (
  investments: Investment[],
  categoryLabelMap: Record<string, string>,
  months = 6,
): InvestmentCategoryPerformanceRow[] => {
  const records = getResolvedInvestmentRecords(investments);
  const categoryGroups = records.reduce<Record<string, ResolvedInvestmentRecord[]>>(
    (groups, record) => {
      const key = record.category;
      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(record);
      return groups;
    },
    {},
  );

  const trendMonths = Math.max(months, 1);
  const monthPoints = Array.from({ length: trendMonths }, (_, index) =>
    dayjs()
      .startOf('month')
      .subtract(trendMonths - 1 - index, 'month')
      .endOf('month'),
  );

  return Object.entries(categoryGroups)
    .map(([key, items]) => {
      const invested = items.reduce((sum, item) => sum + item.investedAmount, 0);
      const currentValue = items.reduce((sum, item) => sum + item.currentValue, 0);
      const returnAmount = currentValue - invested;
      const returnPercentage = invested > 0 ? (returnAmount / invested) * 100 : 0;

      return {
        key,
        label: categoryLabelMap[key] || key,
        holdings: items.length,
        invested,
        currentValue,
        returnAmount,
        returnPercentage,
        investmentIds: items.map((item) => item.id),
        sparkline: monthPoints.map((pointDate) =>
          items.reduce((sum, item) => {
            if (item.timelineStartDate.isAfter(pointDate)) {
              return sum;
            }

            return sum + getInvestmentCurrentValueAtDate(item.investment, pointDate);
          }, 0),
        ),
      };
    })
    .sort((left, right) => right.currentValue - left.currentValue);
};

export const getInvestmentMaturityLadderData = (
  investments: Investment[],
  months = 6,
): InvestmentMaturityBucket[] => {
  const records = getResolvedInvestmentRecords(investments);
  const startMonth = dayjs().startOf('month');
  const buckets = Array.from({ length: months }, (_, index) => {
    const bucketMonth = startMonth.add(index, 'month');
    return {
      label: bucketMonth.format('MMM YYYY'),
      amount: 0,
      count: 0,
      investmentIds: [] as InvestmentId[],
      start: bucketMonth,
      end: bucketMonth.endOf('month'),
    };
  });

  records.forEach((item) => {
    if (item.investment.status !== 'active' || !item.investment.maturityDate) return;

    const maturityDate = dayjs(item.investment.maturityDate);
    if (!maturityDate.isValid()) return;

    const bucket = buckets.find(
      (entry) =>
        !maturityDate.isBefore(entry.start, 'day') &&
        !maturityDate.isAfter(entry.end, 'day'),
    );

    if (!bucket) return;

    bucket.amount += item.currentValue;

    bucket.count += 1;
    bucket.investmentIds.push(item.id);
  });

  return buckets.map(({ label, amount, count, investmentIds }) => ({
    label,
    amount,
    count,
    investmentIds,
  }));
};

export const getInvestmentPortfolioGrowthData = (
  investments: Investment[],
): InvestmentPortfolioGrowthPoint[] => {
  const datedInvestments = getResolvedInvestmentRecords(investments).filter((item) =>
    item.timelineStartDate.isValid(),
  );

  if (datedInvestments.length === 0) {
    return [];
  }

  const earliestStart = datedInvestments.reduce<dayjs.Dayjs>(
    (earliest, entry) =>
      entry.timelineStartDate.isBefore(earliest) ? entry.timelineStartDate : earliest,
    datedInvestments[0].timelineStartDate,
  );
  const today = dayjs();
  const currentMonth = today.startOf('month');
  const monthCount = currentMonth.diff(earliestStart, 'month');

  return Array.from({ length: monthCount + 1 }, (_, monthOffset) => {
    const monthStart = earliestStart.add(monthOffset, 'month');
    const pointDate = monthStart.endOf('month').isAfter(today)
      ? today
      : monthStart.endOf('month');

    const point = datedInvestments.reduce<InvestmentPortfolioGrowthPoint>(
      (acc, entry) => {
        if (entry.timelineStartDate.isAfter(pointDate)) {
          return acc;
        }

        const investedValue = entry.investedAmount;
        const resolvedValue = resolveInvestmentValueAtDate(
          entry.investment,
          pointDate,
        );

        acc.investedToDate += investedValue;
        acc.currentValueToDate += resolvedValue.value;

        if (resolvedValue.source === 'snapshot') {
          acc.snapshotBackedValue += resolvedValue.value;
        } else if (resolvedValue.source === 'estimated') {
          acc.estimatedValue += resolvedValue.value;
        } else {
          acc.investedOnlyValue += resolvedValue.value;
        }

        return acc;
      },
      {
        label: monthStart.format('MMM YYYY'),
        investedToDate: 0,
        currentValueToDate: 0,
        returnToDate: 0,
        snapshotBackedValue: 0,
        estimatedValue: 0,
        investedOnlyValue: 0,
      },
    );

    point.returnToDate = point.currentValueToDate - point.investedToDate;

    return point;
  });
};

export const getInvestmentYearlyTimeSeriesData = (
  investments: Investment[],
): InvestmentSeriesPoint[] => {
  if (investments.length === 0) return [];
  const records = getResolvedInvestmentRecords(investments);

  const yearGroups: Record<string, InvestmentSeriesPoint> = {};

  records.forEach((item) => {
    const startDate = item.timelineStartDate;
    if (!startDate.isValid()) return;

    const month = startDate.month();
    const year = startDate.year();
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

    const investedAmount = item.investedAmount;
    const returnAmount = item.returnAmount;

    yearGroups[fiscalYearLabel].invested += investedAmount;
    yearGroups[fiscalYearLabel].return += returnAmount;

    const category = item.category;
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
  const records = getResolvedInvestmentRecords(investments);

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

  records.forEach((item) => {
    const startDate = item.timelineStartDate;
    if (!startDate.isValid()) return;

    const month = startDate.month();
    const year = startDate.year();
    const fiscalYear = month >= FISCAL_YEAR_START_MONTH ? year : year - 1;

    if (fiscalYear !== startYear) return;

    const monthKey = `${MONTH_NAMES[month]} ${year}`;
    if (monthKey in monthGroups) {
      const investedAmount = item.investedAmount;
      const returnAmount = item.returnAmount;

      monthGroups[monthKey].invested += investedAmount;
      monthGroups[monthKey].return += returnAmount;

      const category = item.category;
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
