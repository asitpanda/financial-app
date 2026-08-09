import { Injectable } from '@nestjs/common';
import { IFinancialAccountDataSourcePort } from './financial-account.datasource.port';
import { mockFinancialAccountsData } from '../../mockdata';
import type { FinancialAccountRecord } from '../financial-account.types';
import { CreateFinancialAccountDto } from '../dto/create-financial-account.dto';
import { UpdateFinancialAccountDto } from '../dto/update-financial-account.dto';

let mockFinancialAccounts = [...mockFinancialAccountsData];
const nextAccountId = () => (mockFinancialAccounts.length ? Math.max(...mockFinancialAccounts.map((account) => account.id)) + 1 : 1);

@Injectable()
export class FinancialAccountMockRepository implements IFinancialAccountDataSourcePort {
  async create(data: CreateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord> {
    const timestamp = new Date();
    const normalizedUserId = Number(userId);
    const newAccount: FinancialAccountRecord = {
      id: nextAccountId(),
      ...data,
      institutionName: data.institutionName ?? null,
      accountNumberMasked: data.accountNumberMasked ?? null,
      isActive: data.isActive ?? true,
      userId: normalizedUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockFinancialAccounts.push(newAccount);
    return newAccount;
  }

  async findAll(userId: string): Promise<FinancialAccountRecord[]> {
    const normalizedUserId = Number(userId);
    return mockFinancialAccounts.filter((account) => account.userId === normalizedUserId);
  }

  async findOne(id: string, userId: string): Promise<FinancialAccountRecord | null> {
    const normalizedId = Number(id);
    const normalizedUserId = Number(userId);
    return mockFinancialAccounts.find((account) => account.id === normalizedId && account.userId === normalizedUserId);
  }

  async update(id: string, data: UpdateFinancialAccountDto, userId: string): Promise<FinancialAccountRecord | null> {
    const normalizedId = Number(id);
    const normalizedUserId = Number(userId);
    const index = mockFinancialAccounts.findIndex((account) => account.id === normalizedId && account.userId === normalizedUserId);
    if (index === -1) return null;

    mockFinancialAccounts[index] = {
      ...mockFinancialAccounts[index],
      ...data,
      updatedAt: new Date(),
    };

    return mockFinancialAccounts[index];
  }

  async delete(id: string, userId: string): Promise<void> {
    const normalizedId = Number(id);
    const normalizedUserId = Number(userId);
    mockFinancialAccounts = mockFinancialAccounts.filter((account) => !(account.id === normalizedId && account.userId === normalizedUserId));
  }
}