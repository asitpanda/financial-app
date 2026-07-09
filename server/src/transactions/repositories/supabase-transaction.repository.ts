import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ITransactionRepository } from './transaction.repository.interface';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';

@Injectable()
export class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(private prisma: PrismaService) {}

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
      where: { id: BigInt(id) as any, userId: userId as any },
    });
  }

  async create(data: CreateTransactionDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const createData: any = {
        ...data,
        userId,
      };

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
        where: { id: BigInt(id) as any, userId: userId as any },
      });

      if (!existingTransaction) return null;

      const updateData: any = {
        ...data,
      };

      const updatedTransaction = await tx.transaction.update({
        where: { id: BigInt(id) as any },
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
        where: { id: BigInt(id) as any, userId: userId as any },
      });

      if (!existingTransaction) return;

      await tx.transaction.delete({
        where: { id: BigInt(id) as any },
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
