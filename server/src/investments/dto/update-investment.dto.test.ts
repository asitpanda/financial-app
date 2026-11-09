import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateInvestmentDto } from './update-investment.dto';

describe('UpdateInvestmentDto', () => {
  it('accepts an empty update because every investment field is optional', () => {
    const update = plainToInstance(UpdateInvestmentDto, {});

    expect(validateSync(update)).toEqual([]);
  });

  it('normalizes and validates only the supplied fields', () => {
    const update = plainToInstance(UpdateInvestmentDto, {
      assetType: ' equity ',
      accountId: '5',
      currentValue: '1250',
    });

    expect(update).toMatchObject({ assetType: 'EQUITY', accountId: 5, currentValue: 1250 });
    expect(validateSync(update)).toEqual([]);
  });

  it.each([
    { status: 'pending' },
    { totalInvested: -1 },
    { accountId: 0 },
    { maturityDate: 'not-a-date' },
    { contributionMode: 'MONTHLY' },
  ])('rejects invalid values for supplied fields: %o', (input) => {
    const update = plainToInstance(UpdateInvestmentDto, input);

    expect(validateSync(update).length).toBeGreaterThan(0);
  });
});