import { InvestmentBenefitStatus, InvestmentBenefitType } from '@prisma/client';
import { dateFromBaseDate } from './shared';
import type { InvestmentBenefitRecord } from '../investment-benefits/investment-benefit.types';

const baseDate = new Date();

export const mockInvestmentBenefitsData: InvestmentBenefitRecord[] = [
	{
		id: 101,
		investmentId: 5,
		benefitType: InvestmentBenefitType.MONEY_BACK,
		amount: 50000,
		benefitDate: dateFromBaseDate(baseDate, 45),
		status: InvestmentBenefitStatus.EXPECTED,
		notes: '5-year Survival Benefit',
		createdAt: dateFromBaseDate(baseDate, -10),
		updatedAt: dateFromBaseDate(baseDate, -10),
	},
	{
		id: 102,
		investmentId: 5,
		benefitType: InvestmentBenefitType.BONUS,
		amount: 35000,
		benefitDate: dateFromBaseDate(baseDate, 130),
		status: InvestmentBenefitStatus.EXPECTED,
		notes: 'Declared policy bonus distribution',
		createdAt: dateFromBaseDate(baseDate, -10),
		updatedAt: dateFromBaseDate(baseDate, -10),
	},
	{
		id: 103,
		investmentId: 5,
		benefitType: InvestmentBenefitType.MATURITY,
		amount: 1200000,
		benefitDate: dateFromBaseDate(baseDate, 5699),
		status: InvestmentBenefitStatus.EXPECTED,
		notes: 'Final maturity sum assured + simple reversionary bonus',
		createdAt: dateFromBaseDate(baseDate, -10),
		updatedAt: dateFromBaseDate(baseDate, -10),
	},
];