import investmentApi from '../api/investments.api';
import type { CreateInvestmentDto } from '../types/investment.types';

interface SaveInvestmentArgs {
	payload: CreateInvestmentDto;
	selectedInvestmentId?: string | number | null;
}

export const saveInvestment = async ({
	payload,
	selectedInvestmentId,
}: SaveInvestmentArgs) => {
	if (selectedInvestmentId != null && selectedInvestmentId !== '') {
		return investmentApi.update(selectedInvestmentId, payload);
	}

	return investmentApi.create(payload);
};

export const removeInvestment = async (id: string | number) => {
	await investmentApi.delete(id);
};
