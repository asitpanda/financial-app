import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ITransactionDataSourcePort } from './transaction.datasource.port';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';

@Injectable()
export class TransactionPrismaRepository implements ITransactionDataSourcePort {
  constructor(private prisma: PrismaService) {}

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

  private async assertValidReferences(tx: any, userId: number, data: any): Promise<void> {
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

    if (data.linkedInvestmentEventId !== null && data.linkedInvestmentEventId !== undefined) {
      const linkedInvestmentEventId = Number(data.linkedInvestmentEventId);
      const linkedEvent = await tx.investmentEvent.findUnique({
        where: { id: linkedInvestmentEventId },
      });
      if (!linkedEvent) {
        throw new BadRequestException(
          `Invalid linkedInvestmentEventId ${linkedInvestmentEventId}. Event does not exist.`,
        );
      }
    }
  }

  private resolveGoalDelta(transaction: { goalId?: number | string | null; type?: string; amount?: number }) {
    if (!transaction?.goalId) return 0;
    const amount = Number(transaction.amount || 0);
    return transaction.type === 'expense' ? -amount : amount;
  }

  async findAll(userId: number) {
    return this.prisma.transaction.findMany({
      where: { userId: userId as any },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    return this.prisma.transaction.findFirst({
      where: { id: id as any, userId: userId as any },
    });
  }

  async create(data: CreateTransactionDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const createData: any = {
        ...data,
        userId,
        goalId: this.normalizeOptionalInt(data.goalId, 'goalId'),
        sourceAccountId: this.normalizeOptionalInt(data.sourceAccountId, 'sourceAccountId'),
        destinationAccountId: this.normalizeOptionalInt(data.destinationAccountId, 'destinationAccountId'),
        linkedInvestmentEventId: this.normalizeOptionalInt(data.linkedInvestmentEventId, 'linkedInvestmentEventId'),
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
    });
  }

  async update(id: number, data: UpdateTransactionDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: { id: id as any, userId: userId as any },
      });

      if (!existingTransaction) return null;

      const updateData: any = {
        ...data,
        goalId: data.goalId !== undefined ? this.normalizeOptionalInt(data.goalId, 'goalId') : undefined,
        sourceAccountId:
          data.sourceAccountId !== undefined
            ? this.normalizeOptionalInt(data.sourceAccountId, 'sourceAccountId')
            : undefined,
        destinationAccountId:
          data.destinationAccountId !== undefined
            ? this.normalizeOptionalInt(data.destinationAccountId, 'destinationAccountId')
            : undefined,
        linkedInvestmentEventId:
          data.linkedInvestmentEventId !== undefined
            ? this.normalizeOptionalInt(data.linkedInvestmentEventId, 'linkedInvestmentEventId')
            : undefined,
      };

      await this.assertValidReferences(tx, userId, {
        ...existingTransaction,
        ...updateData,
      });

      const updatedTransaction = await tx.transaction.update({
        where: { id: id as any },
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

  async delete(id: number, userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: { id: id as any, userId: userId as any },
      });

      if (!existingTransaction) return;

      await tx.transaction.delete({
        where: { id: id as any },
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

  async findByDateRange(userId: number, startDate: Date, endDate: Date) {
    return this.prisma.transaction.findMany({
      where: {
        userId: userId as any,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByType(userId: number, type: string) {
    return this.prisma.transaction.findMany({
      where: { userId: userId as any, type },
      orderBy: { date: 'desc' },
    });
  }
}
