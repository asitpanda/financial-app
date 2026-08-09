export type { UserRecord } from '../auth/auth.types';
export type { TransactionRecord } from '../transactions/transaction.types';
export type { CategoryRecord } from '../categories/category.types';
export type { FinancialAccountRecord } from '../financial-accounts/financial-account.types';
export type { GoalRecord } from '../goals/goal.types';
export type { InvestmentRecord } from '../investments/investment.types';
export type { InvestmentAssetTaxonomyRecord } from '../investment-asset-taxonomy/investment-asset-taxonomy.types';
export type { InvestmentEventRecord } from '../investment-events/investment-event.types';
export type { InvestmentContributionPlanRecord } from '../investment-contribution-plans/investment-contribution-plan.types';
export type { ValuationSnapshotRecord } from '../valuation-snapshots/valuation-snapshot.types';

import type { UserRecord } from '../auth/auth.types';
import type { TransactionRecord } from '../transactions/transaction.types';
import type { CategoryRecord } from '../categories/category.types';
import type { FinancialAccountRecord } from '../financial-accounts/financial-account.types';
import type { GoalRecord } from '../goals/goal.types';
import type { InvestmentRecord } from '../investments/investment.types';
import type { InvestmentAssetTaxonomyRecord } from '../investment-asset-taxonomy/investment-asset-taxonomy.types';
import type { InvestmentEventRecord } from '../investment-events/investment-event.types';
import type { InvestmentContributionPlanRecord } from '../investment-contribution-plans/investment-contribution-plan.types';
import type { ValuationSnapshotRecord } from '../valuation-snapshots/valuation-snapshot.types';

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