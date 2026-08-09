import { Injectable } from '@nestjs/common';
import type { FinancialAccountRecord } from '../financial-account.types';
import { PrismaService } from '../../database/prisma.service';
import { CreateFinancialAccountDto } from '../dto/create-financial-account.dto';
import { UpdateFinancialAccountDto } from '../dto/update-financial-account.dto';
import { IFinancialAccountDataSourcePort } from './financial-account.datasource.port';

@Injectable()
export class FinancialAccountPrismaRepository implements IFinancialAccountDataSourcePort {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord> {
    return this.prisma.financialAccount.create({
      data: {
        ...data,
        userId: Number(userId),
      },
    });
  }

  async findAll(userId: string): Promise<FinancialAccountRecord[]> {
    return this.prisma.financialAccount.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<FinancialAccountRecord | null> {
    return this.prisma.financialAccount.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });
  }

  async update(id: string, data: UpdateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord | null> {
    const existing = await this.prisma.financialAccount.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });

    if (!existing) return null;

    return this.prisma.financialAccount.update({
      where: { id: Number(id) },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.prisma.financialAccount.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    });

    if (!existing) return;

    await this.prisma.financialAccount.delete({
      where: { id: Number(id) },
    });
  }
}