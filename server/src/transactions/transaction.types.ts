import type { TransactionType } from '@prisma/client';
import type { CreateTransactionDto } from './dto/create-transaction.dto';

export type TransactionRecord = {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  categoryId: number | null;
  categoryLabelSnapshot: string | null;
  sourceAccountId: number | null;
  destinationAccountId: number | null;
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
  categoryId?: number | string | null;
  goalId?: number | string | null;
  sourceAccountId?: number | string | null;
  destinationAccountId?: number | string | null;
};

export type TransactionPersistedWriteData = {
  userId?: number;
  type?: TransactionType;
  amount?: number;
  categoryId?: number | null;
  categoryLabelSnapshot?: string | null;
  sourceAccountId?: number | null;
  destinationAccountId?: number | null;
  date?: Date;
  notes?: string | null;
  goalId?: number | null;
};

export type TransactionCreateData = TransactionPersistedWriteData & {
  userId: number;
  type: TransactionType;
  amount: number;
  categoryId?: number | null;
  categoryLabelSnapshot?: string | null;
  date: Date;
};

export type TransactionUpdateData = TransactionPersistedWriteData;
export type TransactionLike = TransactionRecord;
