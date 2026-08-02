export type {
  UserRecord,
  TransactionRecord,
  CategoryRecord,
  FinancialAccountRecord,
  GoalRecord,
  InvestmentRecord,
  InvestmentAssetTaxonomyRecord,
  InvestmentEventRecord,
  InvestmentContributionPlanRecord,
  ValuationSnapshotRecord,
} from '../domain/types';

import type {
  UserRecord,
  TransactionRecord,
  CategoryRecord,
  FinancialAccountRecord,
  GoalRecord,
  InvestmentRecord,
  InvestmentAssetTaxonomyRecord,
  InvestmentEventRecord,
  InvestmentContributionPlanRecord,
  ValuationSnapshotRecord,
} from '../domain/types';

// Backward-compatible aliases for existing mock imports.
export type MockUser = UserRecord;
export type MockTransaction = TransactionRecord;
export type MockCategory = CategoryRecord;
export type MockFinancialAccount = FinancialAccountRecord;
export type MockGoal = GoalRecord;
export type MockInvestment = InvestmentRecord;
export type MockInvestmentAssetTaxonomy = InvestmentAssetTaxonomyRecord;
export type MockInvestmentEvent = InvestmentEventRecord;
export type MockInvestmentContributionPlan = InvestmentContributionPlanRecord;
export type MockValuationSnapshot = ValuationSnapshotRecord;