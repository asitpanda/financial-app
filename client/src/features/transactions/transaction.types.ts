export interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT";
  amount: number;
  category?: string | null;
  categoryId?: string | number | null;
  categoryLabelSnapshot?: string;
  source?: string;
  sourceAccountId?: number | null;
  destinationAccountId?: number | null;
  date: string;
  notes?: string;
  goalId?: string | number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT";
  amount: number;
  categoryId?: number | null;
  categoryLabelSnapshot?: string | null;
  sourceAccountId?: number | null;
  destinationAccountId?: number | null;
  date: string;
  notes?: string;
  goalId?: number | null;
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {}

export interface TransactionRecord extends Transaction {
  _id?: string;
}

export interface TransactionSavePayload {
  type?: "INCOME" | "EXPENSE" | "TRANSFER";
  amount?: number;
  category?: string;
  categoryId?: string | number | null;
  source?: string;
  destination?: string;
  date?: Date | string;
  notes?: string;
  goalId?: string | number | null;
}
