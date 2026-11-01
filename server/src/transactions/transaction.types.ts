import type { TransactionType } from '@prisma/client';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { ListQuery, ListResult } from '../common/listing/listing.types';

export interface TransactionListQuery extends ListQuery {
  search?: string;
  accountId?: number;
  type?: TransactionType;
  categoryId?: number;
  fromDate?: string;
  toDate?: string;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export type TransactionListRow = TransactionRecord & {
  debitAmount: number | null;
  creditAmount: number | null;
  balanceAfter: number | null;
};

export interface TransactionPeriodSummary {
  totalIncome: number | null;
  totalExpense: number | null;
  net: number | null;
  transactionCount: number;
  openingBalance: number | null;
  moneyIn: number | null;
  moneyOut: number | null;
  closingBalance: number | null;
  multiCurrency: boolean;
}

export type TransactionListResult = ListResult<TransactionRecord>;

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
  investment?: {
    id: number;
    name: string;
    institutionName: string | null;
  } | null;
  investmentEventType?: string | null;
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
