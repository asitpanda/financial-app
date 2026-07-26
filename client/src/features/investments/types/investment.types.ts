export type InvestmentStatus = "active" | "matured" | "closed";

export interface InvestmentDocumentsMeta {
	documents: string[];
}

export interface InvestmentContributionPlan {
	id: string | number;
	cadenceUnit: string;
	cadenceInterval: number;
	amount: number;
	nextDueDate?: string | null;
	isActive?: boolean;
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
