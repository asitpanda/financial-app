export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category?: string;
  categoryId?: string | number | null;
  categoryLabelSnapshot?: string;
  source?: string;
  sourceAccountId?: number | null;
  transactionKind?: string;
  date: string;
  notes?: string;
  goalId?: string | number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  type: "income" | "expense";
  amount: number;
  categoryId: number;
  categoryLabelSnapshot: string;
  transactionKind: string;
  sourceAccountId?: number;
  destinationAccountId?: number;
  linkedInvestmentEventId?: number;
  date: string;
  notes?: string;
  goalId?: number | null;
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {}

export interface TransactionRecord extends Transaction {
  _id?: string;
}

export interface TransactionSavePayload {
  type?: "income" | "expense";
  amount?: number;
  category?: string;
  categoryId?: string | number | null;
  source?: string;
  date?: Date | string;
  notes?: string;
  goalId?: string | number | null;
}
