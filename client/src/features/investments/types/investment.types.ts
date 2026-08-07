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

export interface InvestmentEvent {
	id: string | number;
	investmentId: string | number;
	recurringPlanId?: string | number | null;
	sourceAccountId?: string | number | null;
	linkedTransactionId?: string | number | null;
	eventType: string;
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

export interface Investment {
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
	activeContributionPlan?: InvestmentContributionPlan | null;
	valuationSnapshots?: InvestmentValuationSnapshot[];
	createdAt?: string;
	updatedAt?: string;
}

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
