import { Injectable } from '@nestjs/common';
import { CreateFinancialAccountDto } from './dto/create-financial-account.dto';
import { UpdateFinancialAccountDto } from './dto/update-financial-account.dto';
import { FinancialAccountRepository } from './repositories/financial-account.repository';
import type { FinancialAccountRecord } from './financial-account.types';

export type FinancialAccountWithBalance = FinancialAccountRecord & { currentBalance: number };

@Injectable()
export class FinancialAccountsService {
  constructor(private readonly repository: FinancialAccountRepository) {}

  async create(createDto: CreateFinancialAccountDto, userId: number) {
    return this.repository.create(createDto, String(userId));
  }

  async findAll(userId: number): Promise<FinancialAccountWithBalance[]> {
    const accounts = await this.repository.findAll(String(userId));
    return this.withCurrentBalance(accounts);
  }

  async findOne(id: number, userId: number): Promise<FinancialAccountWithBalance | null> {
    const account = await this.repository.findOne(String(id), String(userId));
    if (!account) return null;
    const [withBalance] = await this.withCurrentBalance([account]);
    return withBalance;
  }

  async update(id: number, updateDto: UpdateFinancialAccountDto, userId: number) {
    return this.repository.update(String(id), updateDto, String(userId));
  }

  async remove(id: number, userId: number) {
    return this.repository.delete(String(id), String(userId));
  }

  /** Single source of truth for currentBalance = openingBalance + incoming - outgoing; only ever called with already ownership-filtered accounts. */
  async withCurrentBalance(accounts: FinancialAccountRecord[]): Promise<FinancialAccountWithBalance[]> {
    const flows = await this.repository.sumTransactionFlows(accounts.map((account) => account.id));
    return accounts.map((account) => {
      const flow = flows.get(account.id) ?? { incoming: 0, outgoing: 0 };
      return {
        ...account,
        currentBalance: Number(account.openingBalance) + flow.incoming - flow.outgoing,
      };
    });
  }

  /** Convenience accessor for callers (e.g. TransactionsService) that only need one account's balance. */
  async getCurrentBalance(account: FinancialAccountRecord): Promise<number> {
    const [withBalance] = await this.withCurrentBalance([account]);
    return withBalance.currentBalance;
  }
}
