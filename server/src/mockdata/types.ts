export type MockUser = {
  id: number;
  email: string;
  password: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MockTransaction = {
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

export type MockCategory = {
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

export type MockFinancialAccount = {
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

export type MockGoal = {
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

export type MockInvestment = {
  id: number;
  userId: number;
  accountId: number | null;
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
  documentsMeta: Record<string, unknown> | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MockInvestmentEvent = {
  id: number;
  investmentId: number;
  sourceAccountId: number | null;
  linkedTransactionId: number | null;
  eventType: string;
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

export type MockInvestmentGoalAllocation = {
  id: number;
  investmentId: number;
  goalId: number;
  allocationType: string;
  allocationPercent: number | null;
  allocationAmount: number | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MockValuationSnapshot = {
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