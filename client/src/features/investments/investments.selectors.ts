import dayjs from 'dayjs';
import {
  formatInvestmentDate,
  getInvestmentCategoryOptions,
  normalizeInvestmentForUi,
} from '../../utils/investmentHelpers';
import type { AccountingTreatment, Investment } from './types/investment.types';
import type { InvestmentAssetTaxonomyNode } from './types/investmentAssetTaxonomy.types';

type InvestmentId = Investment['id'];

export interface InvestmentDashboardKpis {
  totalInvestments: number;
  // Total long-term capital committed: INVESTMENT + INSURANCE_SAVINGS contributions
  totalContributions: number;
  // INVESTMENT-only: amount invested in INVESTMENT-treated products
  totalInvested: number;
  // INVESTMENT-only: current market value of INVESTMENT-treated products
  totalCurrentValue: number;
  totalReturn: number;
  returnPercentage: number;
  // INSURANCE_SAVINGS current value (when available)
  totalCurrentValueFromInsuranceSavings: number;
  // Upcoming maturity within 90 days: INVESTMENT only
  upcomingMaturity: number;
  // Upcoming maturity/benefits within 90 days: INSURANCE_SAVINGS only
  upcomingMaturityFromInsuranceSavings: number;
  // Total insurance cover: both INSURANCE_SAVINGS and PROTECTION_EXPENSE
  insuranceCover: number;
  // Insurance cover from PROTECTION_EXPENSE products
  insuranceCoverProtection: number;
  // Insurance cover from INSURANCE_SAVINGS products
  insuranceCoverSavings: number;
  // Cumulative premium/contribution paid toward INSURANCE_SAVINGS products
  insuranceSavingsContribution: number;
  // Cumulative premium paid toward PROTECTION_EXPENSE products
  protectionExpenseTotal: number;
}

export interface InvestmentAllocationSegment {
  key: string;
  label: string;
  value: number;
  investmentIds: InvestmentId[];
  // parent assetType code; present only on category-level rows
  assetType?: string;
  // parent assetCategory code; present only on holding-level rows
  assetCategory?: string;
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
  // INSURANCE_SAVINGS products with known current value (e.g., surrender value, policy value)
  insuranceSavingsWithValueCount: number;
  insuranceSavingsWithValueValue: number;
  // INSURANCE_SAVINGS products without known current value (e.g., immature policies)
  // These are NOT flagged as stale - they lack value by design, not due to missing updates
  insuranceSavingsWithoutValueCount: number;
  staleValuationCount: number;
  staleValuationValue: number;
  snapshotBackedIds: InvestmentId[];
  estimatedIds: InvestmentId[];
  investedOnlyIds: InvestmentId[];
  insuranceSavingsWithValueIds: InvestmentId[];
  insuranceSavingsWithoutValueIds: InvestmentId[];
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
  // parent assetType code; present only on category-level rows
  assetType?: string;
  // parent assetCategory code; present only on holding-level rows
  assetCategory?: string;
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
  treatmentLabel: string;
  treatmentBadgeTone: 'primary' | 'secondary' | 'warning' | 'default';
}

export interface InvestmentUpcomingBenefitItem {
  id: string;
  investmentId: InvestmentId;
  productName: string;
  institutionName: string;
  assetType: string;
  assetCategory?: string;
  accountingTreatment: AccountingTreatment;
  benefitType: string;
  benefitLabel: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  status: string;
}

export interface InsuranceCategoryCoverageSegment {
  key: string;
  label: string;
  categoryKey: string;
  coverAmount: number;
  percentage: number;
  color: string;
  treatment: AccountingTreatment;
  policyCount: number;
}

export interface InsurancePositionSummary {
  totalCover: number;
  totalCoverProtection: number;
  totalCoverSavings: number;
  savingsPremiumPaid: number;
  protectionPremiumPaid: number;
  totalPremiumsPaid: number;
  annualProtectionPremium: number;
  annualSavingsPremium: number;
  annualTotalPremium: number;
  expectedBenefitsTotal: number;
  activePoliciesCount: number;
  upcomingPremiumsCount: number;
  urgentPremiumsCount: number;
  coverageSegments: InsuranceCategoryCoverageSegment[];
}

export interface InsurancePositionRow {
  key: string;
  label: string;
  categoryKey?: string;
  holdingsCount: number;
  treatment: AccountingTreatment;
  insuranceCover: number;
  totalInvestedOrPremium: number;
  annualPremium: number;
  currentValue?: number;
  expectedBenefits: number;
  nextBenefitLabel?: string;
  nextBenefitAmount?: number;
  nextBenefitDate?: string;
  nextDueDate?: string | null;
  nextDueAmount?: number;
  daysUntilDue?: number;
  dueUrgency?: 'urgent' | 'upcoming' | 'normal' | 'none';
  investmentIds: InvestmentId[];
  status?: string;
  institutionName?: string;
  policyNumber?: string | null;
}

export interface InvestmentFilterInput {
  search: string;
  statusFilter: string;
  categoryFilter: string;
  treatmentFilter?: string;
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

const getAccountingTreatment = (investment: Investment): AccountingTreatment =>
  investment.accountingTreatment || 'INVESTMENT';

const isPortfolioInvestment = (investment: Investment) =>
  getAccountingTreatment(investment) === 'INVESTMENT';

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
  const investmentRecords = records.filter((item) => isPortfolioInvestment(item.investment));
  const insuranceSavingsRecords = records.filter(
    (item) => getAccountingTreatment(item.investment) === 'INSURANCE_SAVINGS',
  );
  const protectionExpenseRecords = records.filter(
    (item) => getAccountingTreatment(item.investment) === 'PROTECTION_EXPENSE',
  );

  const totalInvested = investmentRecords.reduce((sum, item) => sum + item.investedAmount, 0);
  const totalCurrentValue = investmentRecords.reduce((sum, item) => sum + item.currentValue, 0);
  const insuranceSavingsContribution = investments
    .filter(
      (investment) =>
        investment.status === 'active' &&
        getAccountingTreatment(investment) === 'INSURANCE_SAVINGS',
    )
    .reduce((sum, investment) => sum + getInvestmentInvestedAmount(investment), 0);
  const protectionExpenseTotal = investments
    .filter(
      (investment) =>
        investment.status === 'active' &&
        getAccountingTreatment(investment) === 'PROTECTION_EXPENSE',
    )
    .reduce((sum, investment) => sum + getInvestmentInvestedAmount(investment), 0);

  const totalReturn = totalCurrentValue - totalInvested;
  const returnPercentage =
    totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  // KPI 1: Total Contributions (INVESTMENT + INSURANCE_SAVINGS)
  const totalContributions = totalInvested + insuranceSavingsContribution;

  // KPI 2: Current value from INSURANCE_SAVINGS products
  const totalCurrentValueFromInsuranceSavings = insuranceSavingsRecords.reduce(
    (sum, item) => sum + item.currentValue,
    0,
  );

  // KPI 3: Upcoming maturity (INVESTMENT only, within 90 days)
  const upcomingMaturity = investmentRecords
    .filter(
      (item) =>
        item.investment.status === 'active' &&
        isWithinDays(item.investment.maturityDate, 90),
    )
    .reduce((sum, item) => sum + item.currentValue, 0);

  // KPI 3 Extended: Upcoming maturity from INSURANCE_SAVINGS (within 90 days)
  const upcomingMaturityFromInsuranceSavings = investments
    .filter(
      (investment) =>
        investment.status === 'active' &&
        getAccountingTreatment(investment) === 'INSURANCE_SAVINGS' &&
        isWithinDays(investment.maturityDate, 90),
    )
    .reduce((sum, investment) => sum + Number(investment.currentValue || 0), 0);

  // KPI 4: Insurance cover breakdown
  const insuranceCoverProtection = protectionExpenseRecords.reduce(
    (sum, item) => sum + Number(item.investment.insuranceCover || 0),
    0,
  );

  const insuranceCoverSavings = insuranceSavingsRecords.reduce(
    (sum, item) => sum + Number(item.investment.insuranceCover || 0),
    0,
  );

  const insuranceCover = insuranceCoverProtection + insuranceCoverSavings;

  return {
    totalInvestments: investments.length,
    totalContributions,
    totalInvested,
    totalCurrentValue,
    totalReturn,
    returnPercentage,
    totalCurrentValueFromInsuranceSavings,
    upcomingMaturity,
    upcomingMaturityFromInsuranceSavings,
    insuranceCover,
    insuranceCoverProtection,
    insuranceCoverSavings,
    insuranceSavingsContribution,
    protectionExpenseTotal,
  };
};

export const getInvestmentCategoryBreakdown = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
): InvestmentAllocationSegment[] => {
  return getInvestmentContributionAllocation(investments, taxonomyNodes);
};

// Contribution allocation (INVESTMENT + INSURANCE_SAVINGS)
export const getInvestmentContributionAllocation = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
): InvestmentAllocationSegment[] => {
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) => getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE',
  );
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

// Current Value allocation (INVESTMENT + INSURANCE_SAVINGS with meaningful currentValue > 0)
export const getInvestmentCurrentValueAllocation = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
): InvestmentAllocationSegment[] => {
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) =>
      getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE' &&
      item.currentValue > 0,
  );
  const categoryLabelLookup = getCategoryLabelLookup(taxonomyNodes, investments);
  const totals = records.reduce<
    Record<string, { value: number; investmentIds: InvestmentId[] }>
  >((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = { value: 0, investmentIds: [] };
    }

    acc[category].value += item.currentValue;
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

export const getInvestmentContributionSubAllocation = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
): InvestmentAllocationSegment[] => {
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) => getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE',
  );
  const categoryLabelLookup = getCategoryLabelLookup(taxonomyNodes, investments);
  const groups: Record<
    string,
    { key: string; assetType: string; value: number; investmentIds: InvestmentId[] }
  > = {};

  records.forEach((item) => {
    const typeKey = String(
      item.investment.assetType || item.investment.type || item.category || 'OTHER',
    ).trim().toUpperCase();
    const catKey = String(item.investment.assetCategory || '').trim().toUpperCase();
    if (!catKey || catKey === typeKey) return;
    const compositeKey = `${typeKey}::${catKey}`;

    if (!groups[compositeKey]) {
      groups[compositeKey] = {
        key: catKey,
        assetType: typeKey,
        value: 0,
        investmentIds: [],
      };
    }
    groups[compositeKey].value += item.investedAmount;
    groups[compositeKey].investmentIds.push(item.id);
  });

  return Object.values(groups)
    .map((group) => ({
      key: group.key,
      label: categoryLabelLookup[group.key] || group.key,
      value: group.value,
      investmentIds: group.investmentIds,
      assetType: group.assetType,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
};

export const getInvestmentCurrentValueSubAllocation = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
): InvestmentAllocationSegment[] => {
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) =>
      getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE' &&
      item.currentValue > 0,
  );
  const categoryLabelLookup = getCategoryLabelLookup(taxonomyNodes, investments);
  const groups: Record<
    string,
    { key: string; assetType: string; value: number; investmentIds: InvestmentId[] }
  > = {};

  records.forEach((item) => {
    const typeKey = String(
      item.investment.assetType || item.investment.type || item.category || 'OTHER',
    ).trim().toUpperCase();
    const catKey = String(item.investment.assetCategory || '').trim().toUpperCase();
    if (!catKey || catKey === typeKey) return;
    const compositeKey = `${typeKey}::${catKey}`;

    if (!groups[compositeKey]) {
      groups[compositeKey] = {
        key: catKey,
        assetType: typeKey,
        value: 0,
        investmentIds: [],
      };
    }
    groups[compositeKey].value += item.currentValue;
    groups[compositeKey].investmentIds.push(item.id);
  });

  return Object.values(groups)
    .map((group) => ({
      key: group.key,
      label: categoryLabelLookup[group.key] || group.key,
      value: group.value,
      investmentIds: group.investmentIds,
      assetType: group.assetType,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
};

export const getInvestmentContributionHoldingAllocation = (
  investments: Investment[],
): InvestmentAllocationSegment[] => {
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) => getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE',
  );

  return records.map((record) => {
    const assetTypeKey = String(
      record.investment.assetType || record.investment.type || record.investment.category || 'OTHER',
    ).trim().toUpperCase();
    const rawCat = String(record.investment.assetCategory || '').trim().toUpperCase();

    return {
      key: String(record.id),
      label: record.investment.name || String(record.id),
      value: record.investedAmount,
      investmentIds: [record.id],
      assetType: assetTypeKey,
      assetCategory: rawCat || undefined,
    };
  });
};

export const getInvestmentCurrentValueHoldingAllocation = (
  investments: Investment[],
): InvestmentAllocationSegment[] => {
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) =>
      getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE' &&
      item.currentValue > 0,
  );

  return records.map((record) => {
    const assetTypeKey = String(
      record.investment.assetType || record.investment.type || record.investment.category || 'OTHER',
    ).trim().toUpperCase();
    const rawCat = String(record.investment.assetCategory || '').trim().toUpperCase();

    return {
      key: String(record.id),
      label: record.investment.name || String(record.id),
      value: record.currentValue,
      investmentIds: [record.id],
      assetType: assetTypeKey,
      assetCategory: rawCat || undefined,
    };
  });
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
  { search, statusFilter, categoryFilter, treatmentFilter }: InvestmentFilterInput,
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
    const investmentTreatment = getAccountingTreatment(investment);
    const matchesTreatment =
      !treatmentFilter || treatmentFilter === 'all' || investmentTreatment === treatmentFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesTreatment;
  });
};

export const getNormalizedInvestments = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
) => investments.map((item) => normalizeInvestmentForUi(item, taxonomyNodes as never[]));

export const getTopInvestmentCurrentValueItems = (
  investments: Investment[],
) => {
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) =>
      item.investment.status === 'active' &&
      getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE' &&
      item.currentValue > 0,
  );

  return [...records]
    .sort(
      (left, right) => right.currentValue - left.currentValue,
    )
    .map((item) => item.investment);
};

export const getUpcomingMaturityItems = (
  investments: Investment[],
  limit = 5,
) => {
  return [...investments]
    .filter(
      (item) =>
        item.status === 'active' &&
        item.maturityDate &&
        getAccountingTreatment(item) !== 'PROTECTION_EXPENSE',
    )
    .sort(
      (left, right) =>
        dayjs(left.maturityDate).valueOf() - dayjs(right.maturityDate).valueOf(),
    )
    .slice(0, limit);
};

export const getRecentInvestments = (
  investments: Investment[],
) => {
  return [...investments].sort(
    (left, right) =>
      dayjs(right.createdAt || right.startDate).valueOf() -
      dayjs(left.createdAt || left.startDate).valueOf(),
  );
};

export const getInvestmentContributionViewItems = (
  investments: Investment[],
): InvestmentContributionViewItem[] => {
  const todayStart = dayjs().startOf('day').valueOf();

  return [...investments]
    .filter(
      (item) =>
        item.status === 'active' &&
        item.activeContributionPlan?.nextDueDate &&
        String(item.activeContributionPlan?.status || '').toLowerCase() === 'active',
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
    .map(({ item, dueDate }) => {
      const dueDaysUntil = dueDate
        ? Math.floor((new Date(dueDate).getTime() - todayStart) / 86400000)
        : 0;
      const dueTone: InvestmentContributionViewItem['dueTone'] =
        dueDaysUntil < 0 ? 'error' : dueDaysUntil <= 7 ? 'warning' : 'default';

      const treatment = getAccountingTreatment(item);
      const treatmentLabel =
        treatment === 'PROTECTION_EXPENSE'
          ? 'Protection Premium'
          : treatment === 'INSURANCE_SAVINGS'
            ? 'Savings Premium'
            : 'Contribution';
      const treatmentBadgeTone: InvestmentContributionViewItem['treatmentBadgeTone'] =
        treatment === 'PROTECTION_EXPENSE'
          ? 'warning'
          : treatment === 'INSURANCE_SAVINGS'
            ? 'primary'
            : 'default';

      return {
        ...item,
        dueDaysUntil,
        dueTone,
        treatmentLabel,
        treatmentBadgeTone,
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
  const records = getResolvedInvestmentRecords(investments).filter((item) =>
    isPortfolioInvestment(item.investment),
  );
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

// Derives one performance row per individual investment for the 3rd drill level.
export const getInvestmentHoldingPerformanceRows = (
  investments: Investment[],
  months = 12,
): InvestmentCategoryPerformanceRow[] => {
  const records = getResolvedInvestmentRecords(investments).filter((item) =>
    isPortfolioInvestment(item.investment),
  );
  const trendMonths = Math.max(months, 1);
  const monthPoints = Array.from({ length: trendMonths }, (_, index) =>
    dayjs()
      .startOf('month')
      .subtract(trendMonths - 1 - index, 'month')
      .endOf('month'),
  );

  return records.map((record) => {
    const invested = record.investedAmount;
    const currentValue = record.currentValue;
    const returnAmount = currentValue - invested;
    const returnPercentage = invested > 0 ? (returnAmount / invested) * 100 : 0;
    const assetTypeKey = String(
      record.investment.assetType || record.investment.type || record.investment.category || 'OTHER',
    ).trim().toUpperCase();
    const rawCat = String(record.investment.assetCategory || '').trim().toUpperCase();

    return {
      key: String(record.id),
      label: record.investment.name || String(record.id),
      holdings: 1,
      invested,
      currentValue,
      returnAmount,
      returnPercentage,
      investmentIds: [record.id],
      assetType: assetTypeKey,
      assetCategory: rawCat || undefined,
      sparkline: monthPoints.map((pointDate) =>
        record.timelineStartDate.isAfter(pointDate)
          ? 0
          : getInvestmentCurrentValueAtDate(record.investment, pointDate),
      ),
    };
  });
};

export const getInvestmentMaturityLadderData = (
  investments: Investment[],
  months = 6,
): InvestmentMaturityBucket[] => {
  const records = getResolvedInvestmentRecords(investments).filter((item) =>
    isPortfolioInvestment(item.investment),
  );
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
    isPortfolioInvestment(item.investment) && item.timelineStartDate.isValid(),
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
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) => getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE',
  );

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
  const records = getResolvedInvestmentRecords(investments).filter(
    (item) => getAccountingTreatment(item.investment) !== 'PROTECTION_EXPENSE',
  );

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

const formatBenefitType = (type: string) => {
  switch (String(type || '').toUpperCase()) {
    case 'MONEY_BACK':
      return 'Money Back';
    case 'MATURITY':
      return 'Maturity';
    case 'SURVIVAL':
      return 'Survival Benefit';
    case 'BONUS':
      return 'Bonus Distribution';
    case 'RETURN_OF_PREMIUM':
      return 'Return of Premium';
    case 'COUPON':
      return 'Coupon';
    case 'INTEREST':
      return 'Interest Payout';
    case 'ANNUITY':
      return 'Annuity';
    case 'DEATH_BENEFIT':
      return 'Death Benefit';
    default:
      return type ? type.replace(/_/g, ' ') : 'Benefit';
  }
};

export const getUpcomingMaturitiesAndBenefits = (
  investments: Investment[],
  bucket: '30d' | '90d' | '180d' = '30d',
): InvestmentUpcomingBenefitItem[] => {
  const today = dayjs().startOf('day');
  const items: InvestmentUpcomingBenefitItem[] = [];

  investments.forEach((investment) => {
    if (investment.status !== 'active') return;
    const treatment = getAccountingTreatment(investment);
    if (treatment === 'PROTECTION_EXPENSE') return;

    const seenBenefitDates = new Set<string>();

    // 1. Explicit benefits array attached to product
    if (Array.isArray(investment.benefits)) {
      investment.benefits.forEach((benefit) => {
        if (benefit.status === 'CANCELLED') return;
        const benefitDate = dayjs(benefit.benefitDate).startOf('day');
        if (!benefitDate.isValid()) return;

        const daysUntil = benefitDate.diff(today, 'day');
        // Non-overlapping exclusive bucket rules:
        // 30 Days = 0..30
        // 90 Days = 31..90
        // 180 Days = 91..180
        const inBucket =
          bucket === '30d'
            ? daysUntil >= 0 && daysUntil <= 30
            : bucket === '90d'
              ? daysUntil >= 31 && daysUntil <= 90
              : daysUntil >= 91 && daysUntil <= 180;

        if (inBucket) {
          items.push({
            id: `benefit-${benefit.id || benefit.benefitDate}-${investment.id}`,
            investmentId: investment.id,
            productName: investment.name,
            institutionName: investment.institution || investment.institutionName || 'Unknown',
            assetType: String(investment.assetType || investment.type || 'OTHER'),
            assetCategory: investment.assetCategory,
            accountingTreatment: treatment,
            benefitType: benefit.benefitType,
            benefitLabel: formatBenefitType(benefit.benefitType),
            amount: Number(benefit.amount || 0),
            dueDate: benefit.benefitDate,
            daysUntil,
            status: benefit.status || 'EXPECTED',
          });
          seenBenefitDates.add(benefitDate.format('YYYY-MM-DD'));
        }
      });
    }

    // 2. Investment maturityDate (deduplicated against MATURITY benefit on same date)
    if (investment.maturityDate) {
      const maturityDate = dayjs(investment.maturityDate).startOf('day');
      const maturityDateStr = maturityDate.format('YYYY-MM-DD');

      if (maturityDate.isValid() && !seenBenefitDates.has(maturityDateStr)) {
        const daysUntil = maturityDate.diff(today, 'day');
        const inBucket =
          bucket === '30d'
            ? daysUntil >= 0 && daysUntil <= 30
            : bucket === '90d'
              ? daysUntil >= 31 && daysUntil <= 90
              : daysUntil >= 91 && daysUntil <= 180;

        if (inBucket) {
          items.push({
            id: `maturity-${investment.id}`,
            investmentId: investment.id,
            productName: investment.name,
            institutionName: investment.institution || investment.institutionName || 'Unknown',
            assetType: String(investment.assetType || investment.type || 'OTHER'),
            assetCategory: investment.assetCategory,
            accountingTreatment: treatment,
            benefitType: 'MATURITY',
            benefitLabel: 'Maturity',
            amount: Number(investment.currentValue || investment.totalInvested || 0),
            dueDate: investment.maturityDate,
            daysUntil,
            status: 'EXPECTED',
          });
        }
      }
    }
  });

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
};

const getAnnualizedPremium = (investment: Investment): number => {
  const plan = investment.activeContributionPlan;
  if (!plan || String(plan.status || '').toLowerCase() !== 'active') {
    return 0;
  }
  const amount = Number(plan.amount || 0);
  const interval = Math.max(Number(plan.cadenceInterval || 1), 1);
  const unit = String(plan.cadenceUnit || '').toLowerCase();

  if (unit === 'year' || unit === 'annually' || unit === 'yearly') {
    return amount / interval;
  }
  if (unit === 'month' || unit === 'monthly') {
    return (amount / interval) * 12;
  }
  if (unit === 'quarter' || unit === 'quarterly') {
    return (amount / interval) * 4;
  }
  if (unit === 'week' || unit === 'weekly') {
    return (amount / interval) * 52;
  }
  return amount;
};

const getNextBenefitInfo = (investment: Investment) => {
  if (!Array.isArray(investment.benefits) || investment.benefits.length === 0) {
    if (investment.maturityDate) {
      const mat = dayjs(investment.maturityDate);
      if (mat.isValid() && mat.isAfter(dayjs().subtract(1, 'day'))) {
        return {
          nextBenefitLabel: 'Maturity',
          nextBenefitAmount: Number(investment.currentValue || investment.totalInvested || 0),
          nextBenefitDate: investment.maturityDate,
        };
      }
    }
    return { nextBenefitLabel: undefined, nextBenefitAmount: undefined, nextBenefitDate: undefined };
  }

  const upcomingBenefits = investment.benefits
    .filter((b) => b.status !== 'CANCELLED' && dayjs(b.benefitDate).isValid())
    .sort((a, b) => dayjs(a.benefitDate).valueOf() - dayjs(b.benefitDate).valueOf());

  const next = upcomingBenefits[0];
  if (!next) return { nextBenefitLabel: undefined, nextBenefitAmount: undefined, nextBenefitDate: undefined };

  return {
    nextBenefitLabel: formatBenefitType(next.benefitType),
    nextBenefitAmount: Number(next.amount || 0),
    nextBenefitDate: next.benefitDate,
  };
};

const getDueUrgencyInfo = (dueDate?: string | null) => {
  if (!dueDate) return { daysUntilDue: undefined, dueUrgency: 'none' as const };
  const d = dayjs(dueDate).startOf('day');
  if (!d.isValid()) return { daysUntilDue: undefined, dueUrgency: 'none' as const };

  const days = d.diff(dayjs().startOf('day'), 'day');
  if (days < 0) return { daysUntilDue: days, dueUrgency: 'urgent' as const };
  if (days <= 30) return { daysUntilDue: days, dueUrgency: 'urgent' as const };
  if (days <= 90) return { daysUntilDue: days, dueUrgency: 'upcoming' as const };
  return { daysUntilDue: days, dueUrgency: 'normal' as const };
};

const CATEGORY_COLOR_PALETTE: Record<string, string> = {
  TERM_LIFE: '#0284c7', // Sky Blue
  LIFE_INSURANCE: '#0284c7',
  HEALTH: '#8b5cf6', // Violet
  HEALTH_INSURANCE: '#8b5cf6',
  SAVINGS: '#10b981', // Emerald
  INSURANCE_SAVINGS: '#10b981',
  ENDOWMENT: '#10b981',
  ULIP: '#10b981',
  MOTOR: '#f59e0b', // Amber
  GENERAL: '#f59e0b',
  OTHER: '#64748b', // Slate
};

export const getInsurancePositionData = (
  investments: Investment[],
  taxonomyNodes: InvestmentAssetTaxonomyNode[],
) => {
  const insuranceInvestments = investments.filter((investment) => {
    const treatment = getAccountingTreatment(investment);
    const assetType = String(investment.assetType || investment.type || '').toUpperCase();
    return (
      investment.status === 'active' &&
      (treatment === 'INSURANCE_SAVINGS' ||
        treatment === 'PROTECTION_EXPENSE' ||
        assetType === 'INSURANCE')
    );
  });

  const categoryLabelLookup = getCategoryLabelLookup(taxonomyNodes, investments);

  let totalCoverProtection = 0;
  let totalCoverSavings = 0;
  let savingsPremiumPaid = 0;
  let protectionPremiumPaid = 0;
  let annualProtectionPremium = 0;
  let annualSavingsPremium = 0;
  let expectedBenefitsTotal = 0;
  const activePoliciesCount = insuranceInvestments.length;
  let upcomingPremiumsCount = 0;
  let urgentPremiumsCount = 0;

  insuranceInvestments.forEach((item) => {
    const treatment = getAccountingTreatment(item);
    const cover = Number(item.insuranceCover || 0);
    const invested = Number(item.totalInvested || 0);
    const annPremium = getAnnualizedPremium(item);

    if (treatment === 'PROTECTION_EXPENSE') {
      totalCoverProtection += cover;
      protectionPremiumPaid += invested;
      annualProtectionPremium += annPremium;
    } else {
      totalCoverSavings += cover;
      savingsPremiumPaid += invested;
      annualSavingsPremium += annPremium;
    }

    if (Array.isArray(item.benefits)) {
      item.benefits.forEach((benefit) => {
        if (benefit.status !== 'CANCELLED') {
          expectedBenefitsTotal += Number(benefit.amount || 0);
        }
      });
    }

    if (
      item.activeContributionPlan?.nextDueDate &&
      String(item.activeContributionPlan?.status || '').toLowerCase() === 'active'
    ) {
      upcomingPremiumsCount += 1;
      const { dueUrgency } = getDueUrgencyInfo(item.activeContributionPlan.nextDueDate);
      if (dueUrgency === 'urgent') {
        urgentPremiumsCount += 1;
      }
    }
  });

  const totalCover = totalCoverProtection + totalCoverSavings;

  // Group by category (Level 2)
  const categoryGroups: Record<string, Investment[]> = {};
  insuranceInvestments.forEach((item) => {
    const key = item.category || 'other';
    if (!categoryGroups[key]) {
      categoryGroups[key] = [];
    }
    categoryGroups[key].push(item);
  });

  const categoryRows: InsurancePositionRow[] = Object.entries(categoryGroups).map(
    ([catKey, items]) => {
      const cover = items.reduce((sum, item) => sum + Number(item.insuranceCover || 0), 0);
      const premium = items.reduce((sum, item) => sum + Number(item.totalInvested || 0), 0);
      const annPremium = items.reduce((sum, item) => sum + getAnnualizedPremium(item), 0);
      const val = items.reduce((sum, item) => sum + Number(item.currentValue || 0), 0);
      const benefits = items.reduce(
        (sum, item) =>
          sum +
          (Array.isArray(item.benefits)
            ? item.benefits
                .filter((b) => b.status !== 'CANCELLED')
                .reduce((bSum, b) => bSum + Number(b.amount || 0), 0)
            : 0),
        0,
      );
      const dominantTreatment = items[0]?.accountingTreatment || 'INSURANCE_SAVINGS';

      // Find earliest upcoming due date among group
      const duePlans = items
        .filter((item) => item.activeContributionPlan?.nextDueDate)
        .map((item) => ({
          dueDate: item.activeContributionPlan!.nextDueDate,
          dueAmount: Number(item.activeContributionPlan!.amount || 0),
        }))
        .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf());

      const nextDue = duePlans[0];
      const { daysUntilDue, dueUrgency } = getDueUrgencyInfo(nextDue?.dueDate);

      return {
        key: catKey,
        label: categoryLabelLookup[catKey] || catKey,
        categoryKey: catKey,
        holdingsCount: items.length,
        treatment: dominantTreatment,
        insuranceCover: cover,
        totalInvestedOrPremium: premium,
        annualPremium: annPremium,
        currentValue: val > 0 ? val : undefined,
        expectedBenefits: benefits,
        nextDueDate: nextDue?.dueDate,
        nextDueAmount: nextDue?.dueAmount,
        daysUntilDue,
        dueUrgency,
        investmentIds: items.map((item) => item.id),
      };
    },
  );

  // Group by individual policy (Level 3)
  const policyRows: InsurancePositionRow[] = insuranceInvestments.map((item) => {
    const benefits = Array.isArray(item.benefits)
      ? item.benefits
          .filter((b) => b.status !== 'CANCELLED')
          .reduce((bSum, b) => bSum + Number(b.amount || 0), 0)
      : 0;

    const { nextBenefitLabel, nextBenefitAmount, nextBenefitDate } = getNextBenefitInfo(item);
    const { daysUntilDue, dueUrgency } = getDueUrgencyInfo(item.activeContributionPlan?.nextDueDate);

    return {
      key: String(item.id),
      label: item.name,
      categoryKey: item.category || 'other',
      holdingsCount: 1,
      treatment: getAccountingTreatment(item),
      insuranceCover: Number(item.insuranceCover || 0),
      totalInvestedOrPremium: Number(item.totalInvested || 0),
      annualPremium: getAnnualizedPremium(item),
      currentValue: Number(item.currentValue || 0) > 0 ? Number(item.currentValue) : undefined,
      expectedBenefits: benefits,
      nextBenefitLabel,
      nextBenefitAmount,
      nextBenefitDate,
      nextDueDate: item.activeContributionPlan?.nextDueDate,
      nextDueAmount: item.activeContributionPlan?.amount,
      daysUntilDue,
      dueUrgency,
      investmentIds: [item.id],
      status: item.status,
      institutionName: item.institution || item.institutionName || undefined,
      policyNumber: item.referenceNumber,
    };
  });

  // Calculate coverage segments for visual composition progress bar
  const coverageSegments: InsuranceCategoryCoverageSegment[] = categoryRows
    .filter((row) => row.insuranceCover > 0)
    .map((row, idx) => {
      const percentage = totalCover > 0 ? (row.insuranceCover / totalCover) * 100 : 0;
      const cleanKey = String(row.key || '').toUpperCase();
      const color =
        CATEGORY_COLOR_PALETTE[cleanKey] ||
        (row.treatment === 'PROTECTION_EXPENSE' ? '#0284c7' : '#10b981');

      return {
        key: row.key,
        label: row.label,
        categoryKey: row.key,
        coverAmount: row.insuranceCover,
        percentage,
        color,
        treatment: row.treatment,
        policyCount: row.holdingsCount,
      };
    })
    .sort((a, b) => b.coverAmount - a.coverAmount);

  const summary: InsurancePositionSummary = {
    totalCover,
    totalCoverProtection,
    totalCoverSavings,
    savingsPremiumPaid,
    protectionPremiumPaid,
    totalPremiumsPaid: savingsPremiumPaid + protectionPremiumPaid,
    annualProtectionPremium,
    annualSavingsPremium,
    annualTotalPremium: annualProtectionPremium + annualSavingsPremium,
    expectedBenefitsTotal,
    activePoliciesCount,
    upcomingPremiumsCount,
    urgentPremiumsCount,
    coverageSegments,
  };

  return {
    summary,
    categoryRows,
    policyRows,
  };
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

      if (
        investment.activeContributionPlan?.nextDueDate &&
        String(investment.activeContributionPlan?.status || '').toLowerCase() === 'active'
      ) {
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
