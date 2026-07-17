export class RecordContributionDto {
  investmentId: string;
  contributionPlanId: string;
  sourceAccountId: string;
  amount: number;
  transactionDate: string;
  notes?: string;
}
