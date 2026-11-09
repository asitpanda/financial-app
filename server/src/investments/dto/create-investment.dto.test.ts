import { InvestmentBenefitType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateInvestmentDto, CreateInvestmentExpectedBenefitDto } from './create-investment.dto';
import { ConfirmRecurringContributionPlanDto } from '../../investment-contribution-plans/dto/confirm-recurring-contribution-plan.dto';
import { UpdateInvestmentContributionPlanDto } from '../../investment-contribution-plans/dto/update-investment-contribution-plan.dto';

const validInvestment = {
  name: 'Retirement fund',
  assetType: 'EQUITY',
  assetCategory: 'MUTUAL_FUND',
  accountId: 5,
  institutionName: 'Example broker',
  status: 'active',
  startDate: '2026-01-01',
  currency: 'USD',
  totalInvested: 1000,
  contributionMode: 'ONE_TIME',
};

describe('CreateInvestmentDto', () => {
  it('normalizes classifications and transforms numeric request values', () => {
    const investment = plainToInstance(CreateInvestmentDto, {
      ...validInvestment,
      assetType: ' equity ',
      assetCategory: ' mutual_fund ',
      accountId: '5',
      totalInvested: '1000',
      contributionMode: ' one_time ',
      currentValue: '1250',
    });

    expect(investment).toMatchObject({
      assetType: 'EQUITY',
      assetCategory: 'MUTUAL_FUND',
      accountId: 5,
      totalInvested: 1000,
      contributionMode: 'ONE_TIME',
      currentValue: 1250,
    });
    expect(validateSync(investment)).toEqual([]);
  });

  it('normalizes null classifications and contribution mode to empty values', () => {
    const investment = plainToInstance(CreateInvestmentDto, {
      ...validInvestment,
      assetType: null,
      assetCategory: null,
      contributionMode: null,
    });

    expect(investment).toMatchObject({
      assetType: '',
      assetCategory: '',
      contributionMode: '',
    });
    expect(validateSync(investment).map(({ property }) => property)).toEqual(
      expect.arrayContaining(['assetType', 'assetCategory', 'contributionMode']),
    );
  });

  it('transforms and validates expected benefits and recurring-plan inputs', () => {
    const investment = plainToInstance(CreateInvestmentDto, {
      ...validInvestment,
      expectedBenefits: [
        {
          benefitType: InvestmentBenefitType.COUPON,
          amount: 0,
          benefitDate: '2026-12-01',
          destinationAccountId: '8',
        },
      ],
      recurringPlan: {
        amount: 100,
        cadenceUnit: 'month',
        cadenceInterval: 1,
        anchorDate: '2026-01-01',
        historicalImportMode: 'OPENING_BALANCE',
      },
      recurringPlanUpdate: { amount: 125 },
    });

    expect(investment.expectedBenefits?.[0]).toBeInstanceOf(CreateInvestmentExpectedBenefitDto);
    expect(investment.expectedBenefits?.[0].destinationAccountId).toBe(8);
    expect(investment.recurringPlan).toBeInstanceOf(ConfirmRecurringContributionPlanDto);
    expect(investment.recurringPlanUpdate).toBeInstanceOf(UpdateInvestmentContributionPlanDto);
    expect(validateSync(investment)).toEqual([]);
  });

  it('rejects an expected benefit with an unsupported benefit type', () => {
    const investment = plainToInstance(CreateInvestmentDto, {
      ...validInvestment,
      expectedBenefits: [{ benefitType: 'UNKNOWN', amount: 0, benefitDate: '2026-12-01' }],
    });

    const benefitErrors = validateSync(investment).find(({ property }) => property === 'expectedBenefits')?.children;

    expect(benefitErrors?.[0].children?.[0].constraints).toHaveProperty('isEnum');
  });

  it.each([
    { name: '' },
    { assetType: '' },
    { assetCategory: '' },
    { accountId: 'not-a-number' },
    { accountId: 0 },
    { institutionName: '' },
    { status: 'pending' },
    { startDate: 'not-a-date' },
    { currency: '' },
    { totalInvested: -1 },
    { contributionMode: 'MONTHLY' },
  ])('rejects invalid required investment values: %o', (overrides) => {
    const investment = plainToInstance(CreateInvestmentDto, { ...validInvestment, ...overrides });

    expect(validateSync(investment).length).toBeGreaterThan(0);
  });

  it.each([
    { currentValue: -1 },
    { maturityDate: 'not-a-date' },
    { insuranceCover: -1 },
    { assetTaxonomyId: 0 },
    { recurringPlanId: 0 },
    { expectedBenefits: [{ benefitType: InvestmentBenefitType.COUPON, amount: -1, benefitDate: '2026-12-01' }] },
  ])('rejects invalid optional investment values: %o', (overrides) => {
    const investment = plainToInstance(CreateInvestmentDto, { ...validInvestment, ...overrides });

    expect(validateSync(investment).length).toBeGreaterThan(0);
  });
});