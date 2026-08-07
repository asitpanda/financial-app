import type { CategoryRecord } from '../categories/categories.types';
import type { GoalRecord } from '../goals/goal.types';
import type { TransactionRecord } from '../transactions/transaction.types';

export interface DashboardInvestmentContributionPlan {
  id: string | number;
  cadenceUnit: string;
  cadenceInterval: number;
  amount: number;
  nextDueDate?: string | null;
  isActive?: boolean;
}

export interface DashboardInvestmentRecord {
  id: string | number;
  assetTaxonomyId?: string | number | null;
  name: string;
  assetType?: string;
  assetCategory?: string;
  type?: string;
  category?: string;
  institutionName?: string | null;
  institution?: string;
  totalInvested: number;
  currentValue?: number;
  startDate?: string | null;
  status: 'active' | 'matured' | 'closed';
  maturityDate?: string | null;
  insuranceCover?: number;
  referenceNumber?: string | null;
  createdAt?: string;
  lastValuationAt?: string | null;
  activeContributionPlan?: DashboardInvestmentContributionPlan | null;
}

export interface DashboardInvestmentActionItem {
  id: string | number;
  name: string;
  kind: 'overdue' | 'due' | 'maturing';
  date: string;
  amount: number;
}

export interface DashboardTaxonomyNode {
  id: string | number;
  label: string;
  level?: number;
  isActive?: boolean;
  parentId?: string | number | null;
  sortOrder?: number;
}

export interface DashboardAccountRecord {
  id: string | number;
  name?: string;
  displayName?: string;
  institutionName?: string;
}

export interface DashboardPageData {
  transactions: TransactionRecord[];
  goals: GoalRecord[];
  categories: CategoryRecord[];
  accounts: DashboardAccountRecord[];
  investments: DashboardInvestmentRecord[];
  taxonomyNodes: DashboardTaxonomyNode[];
}

export interface DashboardAccountOverviewRow {
  name: string;
  currentBalance: number;
  periodChange: number;
  transactions: number;
  periodTransactions: number;
}

export interface DashboardCategoryPieItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface DashboardMonthlySummary {
  highestIncome: TransactionRecord | null;
  highestExpense: TransactionRecord | null;
  totalTransactions: number;
  averageExpense: number;
  savingsRate: number;
}

export interface DashboardInvestmentSummary {
  activeCount: number;
  totalInvested: number;
  currentValue: number;
  unrealisedGain: number;
  unrealisedGainPct: number;
  periodTotalInvested: number;
  periodCurrentValue: number;
  periodUnrealisedGain: number;
  periodUnrealisedGainPct: number;
  insuranceCover: number;
  allocationBreakdown: Array<{
    key: string;
    label: string;
    value: number;
    pct: number;
  }>;
  upcomingContributionAmount: number;
  upcomingMaturityAmount: number;
  actionItems: DashboardInvestmentActionItem[];
  actionItemsTotalCount: number;
  staleValuationCount: number;
}
