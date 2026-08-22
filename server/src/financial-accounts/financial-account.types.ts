export type FinancialAccountRecord = {
  id: number;
  userId: number;
  name: string;
  displayName: string;
  accountType: string;
  institutionName: string | null;
  accountNumberMasked: string | null;
  currency: string;
  isActive: boolean;
  openingBalance: number;
  createdAt: Date;
  updatedAt: Date;
};
