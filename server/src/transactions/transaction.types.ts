import type { CreateTransactionDto } from './dto/create-transaction.dto';

export type TransactionRecord = {
  id: number;
  userId: number;
  type: string;
  amount: number;
  categoryId: number;
  categoryLabelSnapshot: string;
  sourceAccountId: number | null;
  destinationAccountId: number | null;
  linkedInvestmentEventId: number | null;
  transactionKind: string;
  date: Date;
  notes: string | null;
  goalId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TransactionGoalDeltaSource = {
  goalId?: number | string | null;
  type?: string;
  amount?: number | null;
};

export type TransactionReferenceCheckInput = Partial<TransactionPersistedWriteData> & {
  categoryId: number | string;
  goalId?: number | string | null;
  sourceAccountId?: number | string | null;
  destinationAccountId?: number | string | null;
  linkedInvestmentEventId?: number | string | null;
};

export type TransactionPersistedWriteData = {
  userId?: number;
  type?: string;
  amount?: number;
  categoryId?: number;
  categoryLabelSnapshot?: string;
  sourceAccountId?: number | null;
  destinationAccountId?: number | null;
  linkedInvestmentEventId?: number | null;
  transactionKind?: string;
  date?: Date;
  notes?: string | null;
  goalId?: number | null;
};

export type TransactionCreateData = TransactionPersistedWriteData & {
  userId: number;
  type: string;
  amount: number;
  categoryId: number;
  categoryLabelSnapshot: string;
  transactionKind: string;
  date: Date;
};

export type TransactionUpdateData = TransactionPersistedWriteData;
export type TransactionLike = TransactionRecord;
