import type { InvestmentBenefitStatus, InvestmentBenefitType } from '@prisma/client';
import type { InvestmentEventRecord } from '../investment-events/investment-event.types';

export type InvestmentBenefitRecord = {
  id: number;
  investmentId: number;
  benefitType: InvestmentBenefitType;
  amount: number;
  benefitDate: Date;
  status: InvestmentBenefitStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvestmentBenefitDetailRecord = InvestmentBenefitRecord & {
  realizedEvents: InvestmentEventRecord[];
};