export interface FinancialAccountRecord {
	id: number | string;
	userId?: number | string;
	name: string;
	displayName: string;
	accountType: string;
	institutionName?: string | null;
	accountNumberMasked?: string | null;
	currency: string;
	isActive: boolean;
	openingBalance: number;
	currentBalance: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateFinancialAccountDto {
	name: string;
	displayName: string;
	accountType: string;
	institutionName?: string;
	accountNumberMasked?: string;
	currency: string;
	isActive: boolean;
	openingBalance?: number;
}

export type UpdateFinancialAccountDto = Partial<Omit<CreateFinancialAccountDto, 'openingBalance'>>;
