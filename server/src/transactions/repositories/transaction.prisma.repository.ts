import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { TransactionType } from '@prisma/client';
import type { TransactionRecord } from '../transaction.types';
import { ITransactionDataSourcePort } from './transaction.datasource.port';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { parseRequiredDateInput } from '../../common/utils/date-input';
import { getListOffset } from '../../common/listing/listing.utils';
import type {
  TransactionCreateData,
  TransactionGoalDeltaSource,
  TransactionListQuery,
  TransactionListResult,
  TransactionPersistedWriteData,
  TransactionReferenceCheckInput,
  TransactionUpdateData,
} from '../transaction.types';

@Injectable()
export class TransactionPrismaRepository implements ITransactionDataSourcePort {
  constructor(private prisma: PrismaService) {}

  private async findTransactionsWithInvestmentContext(
    userId: number,
    where: Prisma.TransactionWhereInput,
  ): Promise<TransactionRecord[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { ...where, userId },
      orderBy: { date: 'desc' },
      include: {
        linkedInvestmentEvents: {
          take: 1,
          where: { investment: { userId } },
          select: {
            eventType: true,
            investment: {
              select: {
                id: true,
                name: true,
                institutionName: true,
              },
            },
          },
        },
      },
    });

    return transactions.map(({ linkedInvestmentEvents, ...transaction }) => ({
      ...transaction,
      investment: linkedInvestmentEvents[0]?.investment ?? null,
      investmentEventType: linkedInvestmentEvents[0]?.eventType ?? null,
    }));
  }

  private normalizeOptionalInt(value: unknown, fieldName: string): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);

    // Frontend commonly sends 0 for optional relations; treat that as "not provided".
    if (parsed === 0) return null;

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException({
        field: fieldName,
        message: `Invalid ${fieldName}: expected a positive integer or null. Received ${value}.`,
      });
    }

    if (parsed < 1) {
      throw new BadRequestException({
        field: fieldName,
        message: `Invalid ${fieldName}: expected a positive integer or null. Received ${value}.`,
      });
    }

    return parsed;
  }

  private async assertValidReferences(
    tx: Prisma.TransactionClient,
    userId: number,
    data: TransactionReferenceCheckInput,
  ): Promise<void> {
    if (data.categoryId !== null && data.categoryId !== undefined) {
      const categoryId = Number(data.categoryId);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new BadRequestException('Invalid categoryId.');
      }

      const category = await tx.category.findFirst({
        where: { id: categoryId, userId },
      });
      if (!category) {
        throw new BadRequestException(
          `Invalid categoryId ${categoryId}. Category does not exist for this user.`,
        );
      }
    }

    if (data.goalId !== null && data.goalId !== undefined) {
      const goalId = Number(data.goalId);
      const goal = await tx.goal.findFirst({
        where: { id: goalId, userId },
      });
      if (!goal) {
        throw new BadRequestException(
          `Invalid goalId ${goalId}. Goal does not exist for this user.`,
        );
      }
    }

    if (data.sourceAccountId !== null && data.sourceAccountId !== undefined) {
      const sourceAccountId = Number(data.sourceAccountId);
      const sourceAccount = await tx.financialAccount.findFirst({
        where: { id: sourceAccountId, userId },
      });
      if (!sourceAccount) {
        throw new BadRequestException(
          `Invalid sourceAccountId ${sourceAccountId}. Account does not exist for this user.`,
        );
      }
    }

    if (data.destinationAccountId !== null && data.destinationAccountId !== undefined) {
      const destinationAccountId = Number(data.destinationAccountId);
      const destinationAccount = await tx.financialAccount.findFirst({
        where: { id: destinationAccountId, userId },
      });
      if (!destinationAccount) {
        throw new BadRequestException(
          `Invalid destinationAccountId ${destinationAccountId}. Account does not exist for this user.`,
        );
      }
    }

  }

  private resolveGoalDelta(transaction: TransactionGoalDeltaSource) {
    if (!transaction?.goalId) return 0;
    const amount = Number(transaction.amount || 0);
    return transaction.type === 'EXPENSE' ? -amount : amount;
  }

  async findAll(userId: number): Promise<TransactionRecord[]> {
    return this.findTransactionsWithInvestmentContext(userId, {});
  }

  async findPage(userId: number, query: TransactionListQuery): Promise<TransactionListResult> {
    const conditions: Prisma.TransactionWhereInput[] = [];
    if (query.accountId) {
      conditions.push({
        OR: [
          { sourceAccountId: query.accountId },
          { destinationAccountId: query.accountId },
        ],
      });
    }
    if (query.type) conditions.push({ type: query.type });
    if (query.categoryId) conditions.push({ categoryId: query.categoryId });
    if (query.fromDate || query.toDate) {
      conditions.push({
        date: {
          ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
          ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
        },
      });
    }
    const search = query.search?.trim();
    if (search) {
      conditions.push({
        OR: [
          { notes: { contains: search, mode: 'insensitive' } },
          { categoryLabelSnapshot: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(conditions.length ? { AND: conditions } : {}),
    };
    const sortBy = query.sortBy ?? 'date';
    const sortDirection = query.sortDirection ?? 'desc';
    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ [sortBy]: sortDirection }, { id: sortDirection }],
        skip: getListOffset(query),
        take: query.limit,
        include: {
          linkedInvestmentEvents: {
            take: 1,
            where: { investment: { userId } },
            select: {
              eventType: true,
              investment: {
                select: { id: true, name: true, institutionName: true },
              },
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: transactions.map(({ linkedInvestmentEvents, ...transaction }) => ({
        ...transaction,
        investment: linkedInvestmentEvents[0]?.investment ?? null,
        investmentEventType: linkedInvestmentEvents[0]?.eventType ?? null,
      })),
      total,
    };
  }

  async findAllForAccount(userId: number, accountId: number): Promise<TransactionRecord[]> {
    return this.findTransactionsWithInvestmentContext(userId, {
      OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }],
    }).then((transactions) => transactions.sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime() || left.id - right.id,
    ));
  }

  async getPeriodTypeTotals(userId: number, fromDate?: string, toDate?: string) {
    const dateFilter = fromDate || toDate
      ? {
          date: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          },
        }
      : {};
    const [groups, incomeExcludingInvestmentWithdrawals] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId,
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          ...dateFilter,
          linkedInvestmentEvents: {
            none: {
              eventType: 'WITHDRAWAL_PRINCIPAL',
              investment: { userId },
            },
          },
        },
        _sum: { amount: true },
      }),
    ]);
    return groups.map((group) => ({
      type: group.type,
      amount: group.type === 'INCOME'
        ? incomeExcludingInvestmentWithdrawals._sum.amount ?? 0
        : group._sum.amount ?? 0,
      count: group._count._all,
    }));
  }

  async findOne(id: number, userId: number): Promise<TransactionRecord | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        linkedInvestmentEvents: {
          take: 1,
          where: { investment: { userId } },
          select: {
            eventType: true,
            investment: {
              select: { id: true, name: true, institutionName: true },
            },
          },
        },
      },
    });

    if (!transaction) return null;
    const { linkedInvestmentEvents, ...transactionData } = transaction;
    return {
      ...transactionData,
      investment: linkedInvestmentEvents[0]?.investment ?? null,
      investmentEventType: linkedInvestmentEvents[0]?.eventType ?? null,
    };
  }

  async create(data: CreateTransactionDto, userId: number, transaction?: Prisma.TransactionClient): Promise<TransactionRecord> {
    const create = async (tx: Prisma.TransactionClient) => {
      const createData: TransactionCreateData = {
        ...data,
        userId,
        date: parseRequiredDateInput(data.date, 'date'),
        categoryId: this.normalizeOptionalInt(data.categoryId, 'categoryId'),
        goalId: this.normalizeOptionalInt(data.goalId, 'goalId'),
        sourceAccountId: this.normalizeOptionalInt(data.sourceAccountId, 'sourceAccountId'),
        destinationAccountId: this.normalizeOptionalInt(data.destinationAccountId, 'destinationAccountId'),
      };

      await this.assertValidReferences(tx, userId, createData);

      const createdTransaction = await tx.transaction.create({
        data: createData,
      });

      const delta = this.resolveGoalDelta(createdTransaction);
      if (createdTransaction.goalId && delta !== 0) {
        await tx.goal.update({
          where: { id: createdTransaction.goalId },
          data: {
            currentAmount: {
              increment: delta,
            },
          },
        });
      }

      return createdTransaction;
    };
    return transaction ? create(transaction) : this.prisma.$transaction(create);
  }

  async update(id: number, data: UpdateTransactionDto, userId: number): Promise<TransactionRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: { id, userId },
      });

      if (!existingTransaction) return null;

      const updateData: TransactionUpdateData = {
        ...data,
        date: data.date !== undefined ? parseRequiredDateInput(data.date, 'date') : undefined,
        goalId: data.goalId !== undefined ? this.normalizeOptionalInt(data.goalId, 'goalId') : undefined,
        sourceAccountId:
          data.sourceAccountId !== undefined
            ? this.normalizeOptionalInt(data.sourceAccountId, 'sourceAccountId')
            : undefined,
        destinationAccountId:
          data.destinationAccountId !== undefined
            ? this.normalizeOptionalInt(data.destinationAccountId, 'destinationAccountId')
            : undefined,
      };

      await this.assertValidReferences(tx, userId, {
        ...existingTransaction,
        ...updateData,
      });

      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: updateData,
      });

      const previousDelta = this.resolveGoalDelta(existingTransaction);
      const nextDelta = this.resolveGoalDelta(updatedTransaction);

      if (existingTransaction.goalId === updatedTransaction.goalId) {
        if (updatedTransaction.goalId && previousDelta !== nextDelta) {
          await tx.goal.update({
            where: { id: updatedTransaction.goalId },
            data: {
              currentAmount: {
                increment: nextDelta - previousDelta,
              },
            },
          });
        }
      } else {
        if (existingTransaction.goalId && previousDelta !== 0) {
          await tx.goal.update({
            where: { id: existingTransaction.goalId },
            data: {
              currentAmount: {
                increment: -previousDelta,
              },
            },
          });
        }

        if (updatedTransaction.goalId && nextDelta !== 0) {
          await tx.goal.update({
            where: { id: updatedTransaction.goalId },
            data: {
              currentAmount: {
                increment: nextDelta,
              },
            },
          });
        }
      }

      return updatedTransaction;
    });
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: { id, userId },
      });

      if (!existingTransaction) return;

      await tx.transaction.delete({
        where: { id },
      });

      const delta = this.resolveGoalDelta(existingTransaction);
      if (existingTransaction.goalId && delta !== 0) {
        await tx.goal.update({
          where: { id: existingTransaction.goalId },
          data: {
            currentAmount: {
              increment: -delta,
            },
          },
        });
      }
    });
  }

  async findByDateRange(userId: number, startDate: Date, endDate: Date): Promise<TransactionRecord[]> {
    return this.findTransactionsWithInvestmentContext(userId, {
      date: { gte: startDate, lte: endDate },
    });
  }

  async findByType(userId: number, type: TransactionType): Promise<TransactionRecord[]> {
    return this.findTransactionsWithInvestmentContext(userId, { type });
  }
}
