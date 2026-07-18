import { createTransaction, deleteTransaction, updateTransaction } from '../../api/transactions';
import type { ActionContract } from '../../types/action';
import type { CreateTransactionDto, UpdateTransactionDto } from '../../types';

interface SaveTransactionActionArgs {
  payload: {
    type?: 'income' | 'expense';
    amount?: number;
    category?: string;
    categoryId?: string | number | null;
    source?: string;
    date?: Date | string;
    notes?: string;
    goalId?: string | null;
  };
  selectedTransaction: any | null;
  getTransactionId: (tx: any) => string;
  onSuccess: () => Promise<void> | void;
}

const toTransactionDto = (payload: SaveTransactionActionArgs['payload']): CreateTransactionDto => {
  const categoryId = Number(payload.categoryId);
  const sourceAccountId = Number(payload.source);
  const goalId = Number(payload.goalId);

  return {
    type: payload.type as 'income' | 'expense',
    amount: Number(payload.amount),
    categoryId,
    categoryLabelSnapshot: String(payload.category || '').trim(),
    transactionKind: payload.type === 'income' ? 'credit' : 'debit',
    sourceAccountId: Number.isNaN(sourceAccountId) ? undefined : sourceAccountId,
    date:
      payload.date instanceof Date
        ? payload.date.toISOString()
        : payload.date
        ? String(payload.date)
        : new Date().toISOString(),
    notes: payload.notes || '',
    goalId: Number.isNaN(goalId) ? null : goalId,
  };
};

interface DeleteTransactionActionArgs {
  targetId?: string | null;
  onSuccess: () => Promise<void> | void;
}

export function buildSaveTransactionAction({
  payload,
  selectedTransaction,
  getTransactionId,
  onSuccess,
}: SaveTransactionActionArgs): ActionContract {
  const isEdit = Boolean(selectedTransaction);

  return {
    intent: isEdit ? 'Update Transaction' : 'Create Transaction',
    payload,
    precheck: () => {
      const hasType = payload?.type === 'income' || payload?.type === 'expense';
      const hasAmount = Number(payload?.amount || 0) > 0;
      const hasCategory = Boolean(payload?.category && payload.category.trim());
      const hasCategoryId = Number(payload?.categoryId) > 0;
      const hasSource = Boolean(payload?.source && payload.source.trim());
      return hasType && hasAmount && hasCategory && hasCategoryId && hasSource;
    },
    execute: async () => {
      const normalizedPayload = toTransactionDto(payload);

      if (isEdit) {
        await updateTransaction(
          getTransactionId(selectedTransaction),
          normalizedPayload as UpdateTransactionDto
        );
      } else {
        await createTransaction(normalizedPayload);
      }

      await onSuccess();
    },
    feedback: {
      loading: isEdit ? 'Updating transaction...' : 'Adding transaction...',
      success: isEdit ? 'Transaction updated successfully' : 'Transaction added successfully',
      error: isEdit ? 'Failed to update transaction' : 'Failed to add transaction',
    },
  };
}

export function buildDeleteTransactionAction({
  targetId,
  onSuccess,
}: DeleteTransactionActionArgs): ActionContract {
  return {
    intent: 'Delete Transaction',
    payload: { targetId },
    precheck: () => Boolean(targetId),
    execute: async () => {
      await deleteTransaction(String(targetId));
      await onSuccess();
    },
    feedback: {
      loading: 'Deleting transaction...',
      success: 'Transaction deleted successfully',
      error: 'Failed to delete transaction',
    },
  };
}
