import type { InvestmentEventType } from '../../../types/investmentEventTypes';

export type InvestmentStatus = "active" | "matured" | "closed";

export interface InvestmentDocumentsMeta {
	documents: string[];
}

export interface InvestmentContributionPlan {
	id: string | number;
	status?: string;
	cadenceUnit: string;
	cadenceInterval: number;
	amount: number;
	historicalImportMode?: string;
	openingPrincipalAmount?: number;
	openingIncomeAmount?: number;
	anchorDate?: string | null;
	endDate?: string | null;
	nextDueDate?: string | null;
	isActive?: boolean;
}

export interface InvestmentValuationSnapshot {
	id: string | number;
	userId?: string | number;
	investmentId: string | number;
	snapshotDate: string;
	marketValue: number;
	units?: number | null;
	price?: number | null;
	source?: string | null;
	createdAt?: string;
}

export interface InvestmentPerformanceHistoryPoint {
	date: string;
	currentValue: number;
	investedValue: number;
	gainLossValue: number;
	gainLossPercentage: number;
	source?: string | null;
	eventType?: InvestmentEventType | null;
}

export interface InvestmentEvent {
	id: string | number;
	investmentId: string | number;
	recurringPlanId?: string | number | null;
	sourceAccountId?: string | number | null;
	linkedTransactionId?: string | number | null;
	eventType: InvestmentEventType;
	dueDate?: string | null;
	status?: string;
	eventSource?: string;
	sequenceNumber?: number | null;
	eventDate: string;
	amount?: number | null;
	units?: number | null;
	pricePerUnit?: number | null;
	netAmount?: number | null;
	notes?: string | null;
	meta?: Record<string, unknown> | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface InvestmentBase {
	id: string | number;
	accountId?: number | null;
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
	status: InvestmentStatus;
	maturityDate?: string | null;
	currency?: string;
	holdingMode?: string | null;
	currentValueSource?: string | null;
	lastValuationAt?: string | null;
	insuranceCover?: number;
	referenceNumber?: string | null;
	documentsMeta?: InvestmentDocumentsMeta | null;
	documents?: string;
	notes?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface InvestmentSummary extends InvestmentBase {
	activeContributionPlan?: InvestmentContributionPlan | null;
}

export interface InvestmentLatestSnapshot {
	id: string | number;
	snapshotDate: string;
	marketValue: number;
	units?: number | null;
	price?: number | null;
	source?: string | null;
}

export interface InvestmentDetailShell extends InvestmentSummary {
	eventCount?: number;
	snapshotCount?: number;
	latestSnapshot?: InvestmentLatestSnapshot | null;
}

export interface InvestmentPerformancePayload {
	investmentId: string | number;
	performanceHistorySource: string | null;
	performanceHistory: InvestmentPerformanceHistoryPoint[];
}

export interface InvestmentDashboardSummaryPayload {
	totalInvestments: number;
	totalInvested: number;
	totalCurrentValue: number;
	totalReturn: number;
	returnPercentage: number;
	upcomingMaturity: number;
	insuranceCover: number;
	valueSourceSummary: {
		snapshotBackedValue: number;
		estimatedValue: number;
		investedOnlyValue: number;
		snapshotBackedCount: number;
		estimatedCount: number;
		investedOnlyCount: number;
		staleValuationCount: number;
		staleValuationValue: number;
		snapshotBackedIds: Array<string | number>;
		estimatedIds: Array<string | number>;
		investedOnlyIds: Array<string | number>;
		staleValuationIds: Array<string | number>;
	};
}

export interface InvestmentDashboardCategoryBreakdownItem {
	key: string;
	invested: number;
	currentValue: number;
	holdings: number;
	investmentIds: Array<string | number>;
}

export interface InvestmentDashboardSeriesPoint {
	label: string;
	invested: number;
	return: number;
	investedBreakdown: Record<string, number>;
	returnBreakdown: Record<string, number>;
}

export interface InvestmentDashboardPortfolioGrowthPoint {
	label: string;
	investedToDate: number;
	currentValueToDate: number;
	returnToDate: number;
	snapshotBackedValue: number;
	estimatedValue: number;
	investedOnlyValue: number;
}

export interface InvestmentDashboardCategoryPerformanceRow {
	key: string;
	label: string;
	holdings: number;
	invested: number;
	currentValue: number;
	returnAmount: number;
	returnPercentage: number;
	sparkline: number[];
	investmentIds: Array<string | number>;
}

export interface InvestmentDashboardUpcomingPayload {
	upcomingContributions: InvestmentSummary[];
	recentInvestments: InvestmentSummary[];
	topCurrentValueItems: InvestmentSummary[];
	upcomingMaturities: InvestmentSummary[];
}

export interface InvestmentDashboardAnalyticsPayload {
	portfolioGrowthData: InvestmentDashboardPortfolioGrowthPoint[];
	timeSeries: {
		yearly: InvestmentDashboardSeriesPoint[];
		monthlyByYear: Record<string, InvestmentDashboardSeriesPoint[]>;
	};
	categoryPerformanceRows: InvestmentDashboardCategoryPerformanceRow[];
}

export interface InvestmentDashboardAnalyticsResponse {
	summary: InvestmentDashboardSummaryPayload;
	categoryBreakdown: InvestmentDashboardCategoryBreakdownItem[];
	upcoming: InvestmentDashboardUpcomingPayload;
	analytics: InvestmentDashboardAnalyticsPayload;
}

export interface InvestmentDrawerData extends InvestmentDetailShell {
	investmentEvents: InvestmentEvent[];
	performanceHistory: InvestmentPerformanceHistoryPoint[];
	performanceHistorySource?: string | null;
	valuationSnapshots: InvestmentValuationSnapshot[];
}

export type Investment = InvestmentSummary;

export interface CreateInvestmentDto {
	accountId?: number | null;
	assetTaxonomyId?: string | number | null;
	name: string;
	assetType?: string;
	assetCategory?: string;
	institutionName?: string | null;
	totalInvested: number;
	currentValue?: number;
	startDate?: string | null;
	status: InvestmentStatus;
	maturityDate?: string | null;
	currency?: string;
	holdingMode?: string | null;
	currentValueSource?: string | null;
	lastValuationAt?: string | null;
	insuranceCover?: number;
	referenceNumber?: string | null;
	documentsMeta?: InvestmentDocumentsMeta | null;
	notes?: string | null;
}

export interface UpdateInvestmentDto extends Partial<CreateInvestmentDto> {}
