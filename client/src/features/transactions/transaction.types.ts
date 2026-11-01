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
  investment?: {
    id: number;
    name: string;
    institutionName?: string | null;
  } | null;
  investmentEventType?: string | null;
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

export interface TransactionListQuery {
  page: number;
  limit: number;
  search?: string;
  accountId?: number;
  type?: Transaction["type"];
  categoryId?: number;
  fromDate?: string;
  toDate?: string;
  sortBy?: "date" | "amount" | "createdAt";
  sortDirection?: "asc" | "desc";
}

export interface TransactionListRow extends TransactionRecord {
  debitAmount: number | null;
  creditAmount: number | null;
  balanceAfter: number | null;
}

export interface TransactionPageSummary {
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

export interface TransactionListResponse {
  data: TransactionListRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  summary: TransactionPageSummary;
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
