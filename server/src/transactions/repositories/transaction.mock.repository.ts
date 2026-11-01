import { Injectable } from '@nestjs/common';
import type { TransactionType } from '@prisma/client';
import { ITransactionDataSourcePort } from './transaction.datasource.port';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { mockTransactionsStore as mockTransactions } from '../../mockdata/transactions';
import { mockGoalsStore } from '../../mockdata/goals';
import type { TransactionRecord } from '../transaction.types';
import type {
  TransactionGoalDeltaSource,
  TransactionListQuery,
  TransactionListResult,
} from '../transaction.types';

const nextTransactionId = () => (mockTransactions.length ? Math.max(...mockTransactions.map((transaction) => transaction.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

const resolveGoalDelta = (transaction: TransactionGoalDeltaSource) => {
  if (!transaction?.goalId) return 0;
  const amount = Number(transaction.amount || 0);
  return transaction.type === 'EXPENSE' ? -amount : amount;
};

const applyGoalDelta = (goalId: number | null | undefined, delta: number, userId: number) => {
  if (!goalId || delta === 0) return;
  const goal = mockGoalsStore.find((item) => item.id === goalId && item.userId === userId);
  if (!goal) return;
  goal.currentAmount = Math.max(0, Number(goal.currentAmount || 0) + delta);
  goal.updatedAt = new Date();
};

@Injectable()
export class TransactionMockRepository implements ITransactionDataSourcePort {
  async findAll(userId: number): Promise<TransactionRecord[]> {
    return mockTransactions.filter((t) => t.userId === userId);
  }

  async findPage(userId: number, query: TransactionListQuery): Promise<TransactionListResult> {
    const search = query.search?.trim().toLowerCase();
    const fromDate = query.fromDate ? new Date(query.fromDate).getTime() : null;
    const toDate = query.toDate ? new Date(query.toDate).getTime() : null;
    const matching = mockTransactions.filter((transaction) => {
      const timestamp = new Date(transaction.date).getTime();
      if (transaction.userId !== userId) return false;
      if (
        query.accountId &&
        transaction.sourceAccountId !== query.accountId &&
        transaction.destinationAccountId !== query.accountId
      ) return false;
      if (query.type && transaction.type !== query.type) return false;
      if (query.categoryId && transaction.categoryId !== query.categoryId) return false;
      if (fromDate !== null && timestamp < fromDate) return false;
      if (toDate !== null && timestamp > toDate) return false;
      if (search && !`${transaction.notes || ''} ${transaction.categoryLabelSnapshot || ''}`.toLowerCase().includes(search)) return false;
      return true;
    });
    const sortBy = query.sortBy ?? 'date';
    const direction = query.sortDirection === 'asc' ? 1 : -1;
    matching.sort((left, right) => {
      const leftValue = sortBy === 'date' || sortBy === 'createdAt'
        ? new Date(left[sortBy]).getTime()
        : Number(left.amount);
      const rightValue = sortBy === 'date' || sortBy === 'createdAt'
        ? new Date(right[sortBy]).getTime()
        : Number(right.amount);
      return (leftValue - rightValue) * direction || (left.id - right.id) * direction;
    });
    const offset = (query.page - 1) * query.limit;
    return { items: matching.slice(offset, offset + query.limit), total: matching.length };
  }

  async findAllForAccount(userId: number, accountId: number): Promise<TransactionRecord[]> {
    return mockTransactions
      .filter((transaction) => transaction.userId === userId && (
        transaction.sourceAccountId === accountId || transaction.destinationAccountId === accountId
      ))
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime() || left.id - right.id);
  }

  async getPeriodTypeTotals(userId: number, fromDate?: string, toDate?: string) {
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() : null;
    const totals = new Map<string, { type: string; amount: number; count: number }>();
    for (const transaction of mockTransactions) {
      const timestamp = new Date(transaction.date).getTime();
      if (transaction.userId !== userId || (from !== null && timestamp < from) || (to !== null && timestamp > to)) continue;
      const existing = totals.get(transaction.type) ?? { type: transaction.type, amount: 0, count: 0 };
      if (!(transaction.type === 'INCOME' && transaction.investmentEventType === 'WITHDRAWAL_PRINCIPAL')) {
        existing.amount += Number(transaction.amount || 0);
      }
      existing.count += 1;
      totals.set(transaction.type, existing);
    }
    return [...totals.values()];
  }

  async findOne(id: number, userId: number): Promise<TransactionRecord | null> {
    return mockTransactions.find((t) => t.id === id && t.userId === userId) ?? null;
  }

  async create(data: CreateTransactionDto, userId: number): Promise<TransactionRecord> {
    const newTransaction: TransactionRecord = {
      id: nextTransactionId(),
      userId,
      categoryId: normalizeNullableNumber(data.categoryId),
      goalId: normalizeNullableNumber(data.goalId),
      sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
      destinationAccountId: normalizeNullableNumber(data.destinationAccountId),
      type: data.type,
      amount: data.amount,
      categoryLabelSnapshot: data.categoryLabelSnapshot ?? null,
      date: new Date(data.date),
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockTransactions.push(newTransaction);
    applyGoalDelta(newTransaction.goalId, resolveGoalDelta(newTransaction), userId);
    return newTransaction;
  }

  async update(id: number, data: UpdateTransactionDto, userId: number): Promise<TransactionRecord | null> {
    const index = mockTransactions.findIndex(
      (t) => t.id === id && t.userId === userId,
    );
    if (index !== -1) {
      const previousTransaction = mockTransactions[index];

      mockTransactions[index] = {
        ...previousTransaction,
        ...data,
        categoryId: data.categoryId !== undefined ? normalizeNullableNumber(data.categoryId) : previousTransaction.categoryId,
        goalId: data.goalId !== undefined ? normalizeNullableNumber(data.goalId) : previousTransaction.goalId,
        sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : previousTransaction.sourceAccountId,
        destinationAccountId: data.destinationAccountId !== undefined ? normalizeNullableNumber(data.destinationAccountId) : previousTransaction.destinationAccountId,
        notes: data.notes !== undefined ? data.notes ?? null : previousTransaction.notes,
        date: data.date ? new Date(data.date) : previousTransaction.date,
        updatedAt: new Date(),
      };

      const nextTransaction = mockTransactions[index];
      const previousDelta = resolveGoalDelta(previousTransaction);
      const nextDelta = resolveGoalDelta(nextTransaction);

      if (previousTransaction.goalId === nextTransaction.goalId) {
        applyGoalDelta(nextTransaction.goalId, nextDelta - previousDelta, userId);
      } else {
        applyGoalDelta(previousTransaction.goalId, -previousDelta, userId);
        applyGoalDelta(nextTransaction.goalId, nextDelta, userId);
      }

      return mockTransactions[index];
    }
    return null;
  }

  async delete(id: number, userId: number): Promise<void> {
    const index = mockTransactions.findIndex(
      (t) => t.id === id && t.userId === userId,
    );
    if (index === -1) return;

    const [existingTransaction] = mockTransactions.splice(index, 1);
    applyGoalDelta(existingTransaction.goalId, -resolveGoalDelta(existingTransaction), userId);
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TransactionRecord[]> {
    return mockTransactions.filter(
      (t) =>
        t.userId === userId && t.date >= startDate && t.date <= endDate,
    );
  }

  async findByType(userId: number, type: TransactionType): Promise<TransactionRecord[]> {
    return mockTransactions.filter(
      (t) => t.userId === userId && t.type === type,
    );
  }
}
