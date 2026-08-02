import { Injectable } from '@nestjs/common';
import { IFinancialAccountDataSourcePort } from './financial-account.datasource.port';
import { mockFinancialAccountsData } from '../../mockdata';

let mockFinancialAccounts = [...mockFinancialAccountsData];
const nextAccountId = () => (mockFinancialAccounts.length ? Math.max(...mockFinancialAccounts.map((account) => account.id)) + 1 : 1);

@Injectable()
export class FinancialAccountMockRepository implements IFinancialAccountDataSourcePort {
  async create(data: any, userId: string): Promise<any> {
    const timestamp = new Date();
    const normalizedUserId = Number(userId);
    const newAccount = {
      id: nextAccountId(),
      ...data,
      isActive: data.isActive ?? true,
      userId: normalizedUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mockFinancialAccounts.push(newAccount);
    return newAccount;
  }

  async findAll(userId: string): Promise<any[]> {
    const normalizedUserId = Number(userId);
    return mockFinancialAccounts.filter((account) => account.userId === normalizedUserId);
  }

  async findOne(id: string, userId: string): Promise<any> {
    const normalizedId = Number(id);
    const normalizedUserId = Number(userId);
    return mockFinancialAccounts.find((account) => account.id === normalizedId && account.userId === normalizedUserId);
  }

  async update(id: string, data: any, userId: string): Promise<any> {
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