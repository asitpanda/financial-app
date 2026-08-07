export type UserRecord = {
  id: number;
  userId: string | null;
  email: string;
  mobile: string | null;
  password: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TransactionRecord = {
  id: number;
  userId: number;
  type: string;
  transactionKind: string;
  categoryId: number;
  goalId: number | null;
  sourceAccountId: number | null;
  destinationAccountId: number | null;
  linkedInvestmentEventId: number | null;
  amount: number;
  categoryLabelSnapshot: string;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryRecord = {
  id: number;
  userId: number;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FinancialAccountRecord = {
  id: number;
  userId: number;
  name: string;
  displayName: string;
  accountType: string;
  institutionName: string | null;
  accountNumberMasked: string | null;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type GoalRecord = {
  id: number;
  userId: number;
  name: string;
  categoryId: number;
  categoryLabelSnapshot: string;
  description: string | null;
  icon: string | null;
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvestmentRecord = {
  id: number;
  userId: number;
  accountId: number | null;
  assetTaxonomyId: number | null;
  name: string;
  assetType: string;
  assetCategory: string;
  holdingMode: string | null;
  institutionName: string | null;
  referenceNumber: string | null;
  status: string;
  startDate: Date | null;
  maturityDate: Date | null;
  currency: string;
  totalInvested: number;
  currentValue: number;
  currentValueSource: string | null;
  lastValuationAt: Date | null;
  insuranceCover: number | null;
  contributionMode: string | null;
  documentsMeta: Record<string, unknown> | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvestmentAssetTaxonomyRecord = {
  id: number;
  userId?: number;
  label: string;
  nodeType: string;
  level: number;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InvestmentEventRecord = {
  id: number;
  investmentId: number;
  recurringPlanId: number | null;
  sourceAccountId: number | null;
  linkedTransactionId: number | null;
  eventType: string;
  dueDate: Date | null;
  status:
    | 'EXPECTED'
    | 'PENDING'
    | 'CONFIRMED'
    | 'SKIPPED'
    | 'FAILED'
    | 'CANCELLED';
  eventSource:
    | 'MANUAL'
    | 'RECURRING_PLAN'
    | 'HISTORICAL_IMPORT'
    | 'BANK_IMPORT'
    | 'BROKER_IMPORT'
    | 'SYSTEM_GENERATED';
  sequenceNumber: number | null;
  eventDate: Date;
  amount: number | null;
  units: number | null;
  pricePerUnit: number | null;
  netAmount: number | null;
  notes: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvestmentContributionPlanRecord = {
  id: number;
  investmentId: number;
  sourceAccountId: number | null;
  status: string;
  amount: number;
  cadenceUnit: string;
  cadenceInterval: number;
  historicalImportMode:
    | 'OPENING_BALANCE'
    | 'TRACK_FROM_TODAY';
  anchorDate: Date;
  lastGeneratedDueDate: Date | null;
  nextDueDate: Date | null;
  endDate: Date | null;
  reminderDaysBefore: number | null;
  autoCreateEvent: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ValuationSnapshotRecord = {
  id: number;
  userId: number;
  investmentId: number;
  snapshotDate: Date;
  marketValue: number;
  units: number | null;
  price: number | null;
  source: string | null;
  createdAt: Date;
};
