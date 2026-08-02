import { Injectable } from '@nestjs/common';
import { ITransactionDataSourcePort } from './transaction.datasource.port';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { mockTransactionsData } from '../../mockdata';
import { mockGoalsStore } from '../../mockdata/goals';

// Mock data store
let mockTransactions = [...mockTransactionsData];
const nextTransactionId = () => (mockTransactions.length ? Math.max(...mockTransactions.map((transaction) => transaction.id)) + 1 : 1);
const normalizeNullableNumber = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? null : Number(value);

const resolveGoalDelta = (transaction: { goalId?: number | null; type?: string; amount?: number }) => {
  if (!transaction?.goalId) return 0;
  const amount = Number(transaction.amount || 0);
  return transaction.type === 'expense' ? -amount : amount;
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
  async findAll(userId: number) {
    return mockTransactions.filter((t) => t.userId === userId);
  }

  async findOne(id: number, userId: number) {
    return mockTransactions.find((t) => t.id === id && t.userId === userId);
  }

  async create(data: CreateTransactionDto, userId: number) {
    const newTransaction = {
      id: nextTransactionId(),
      userId,
      categoryId: Number(data.categoryId),
      goalId: normalizeNullableNumber(data.goalId),
      sourceAccountId: normalizeNullableNumber(data.sourceAccountId),
      destinationAccountId: normalizeNullableNumber(data.destinationAccountId),
      linkedInvestmentEventId: normalizeNullableNumber(data.linkedInvestmentEventId),
      type: data.type,
      transactionKind: data.transactionKind,
      amount: data.amount,
      categoryLabelSnapshot: data.categoryLabelSnapshot,
      date: new Date(data.date),
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockTransactions.push(newTransaction);
    applyGoalDelta(newTransaction.goalId, resolveGoalDelta(newTransaction), userId);
    return newTransaction;
  }

  async update(id: number, data: UpdateTransactionDto, userId: number) {
    const index = mockTransactions.findIndex(
      (t) => t.id === id && t.userId === userId,
    );
    if (index !== -1) {
      const previousTransaction = mockTransactions[index];

      mockTransactions[index] = {
        ...previousTransaction,
        ...data,
        categoryId: data.categoryId !== undefined ? Number(data.categoryId) : previousTransaction.categoryId,
        goalId: data.goalId !== undefined ? normalizeNullableNumber(data.goalId) : previousTransaction.goalId,
        sourceAccountId: data.sourceAccountId !== undefined ? normalizeNullableNumber(data.sourceAccountId) : previousTransaction.sourceAccountId,
        destinationAccountId: data.destinationAccountId !== undefined ? normalizeNullableNumber(data.destinationAccountId) : previousTransaction.destinationAccountId,
        linkedInvestmentEventId: data.linkedInvestmentEventId !== undefined ? normalizeNullableNumber(data.linkedInvestmentEventId) : previousTransaction.linkedInvestmentEventId,
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

  async delete(id: number, userId: number) {
    const existingTransaction = mockTransactions.find(
      (t) => t.id === id && t.userId === userId,
    );
    mockTransactions = mockTransactions.filter(
      (t) => !(t.id === id && t.userId === userId),
    );
    if (existingTransaction) {
      applyGoalDelta(existingTransaction.goalId, -resolveGoalDelta(existingTransaction), userId);
    }
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date) {
    return mockTransactions.filter(
      (t) =>
        t.userId === userId && t.date >= startDate && t.date <= endDate,
    );
  }

  async findByType(userId: number, type: string) {
    return mockTransactions.filter(
      (t) => t.userId === userId && t.type === type,
    );
  }
}
