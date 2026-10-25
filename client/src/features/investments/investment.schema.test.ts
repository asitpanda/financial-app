import { describe, expect, it } from 'vitest';
import {
  validateAssetTaxonomyForm,
  validateInvestmentForm,
  validateRecordContributionForm,
} from './investment.schema';

const validInvestment = {
  accountId: 'account-1',
  name: 'Index fund',
  type: 'MUTUAL_FUND',
  category: 'EQUITY',
  institution: 'Broker',
  totalInvested: '1000',
  currentValue: '1200',
  startDate: '2026-01-01',
  status: 'active' as const,
  maturityDate: '2027-01-01',
  insuranceCover: '0',
};

const validTaxonomy = {
  label: 'Equity',
  nodeType: 'category',
  level: 2,
  parentId: 'type-1',
  sortOrder: 1,
  isActive: 'true' as const,
};

describe('investment validation', () => {
  it('accepts a complete investment and coerces numeric form values', () => {
    expect(validateInvestmentForm(validInvestment)).toEqual({});
  });

  it('reports required fields and rejects negative numeric values', () => {
    const errors = validateInvestmentForm({
      ...validInvestment,
      accountId: '',
      name: ' ',
      type: '',
      category: '',
      institution: ' ',
      totalInvested: '-1',
      currentValue: '-2',
      startDate: null,
      status: 'active',
      insuranceCover: '-3',
    });

    expect(errors).toMatchObject({
      accountId: 'Account is required',
      name: 'Investment name is required',
      type: 'Investment type is required',
      category: 'Investment category is required',
      institution: 'Institution is required',
      totalInvested: 'Total invested cannot be negative',
      currentValue: 'Current value cannot be negative',
      startDate: 'Start date is required',
      insuranceCover: 'Insurance cover cannot be negative',
    });
  });

  it('rejects invalid dates and maturity before the start date', () => {
    expect(validateInvestmentForm({ ...validInvestment, startDate: 'invalid' })).toMatchObject({
      startDate: 'Start date is required',
    });
    expect(
      validateInvestmentForm({ ...validInvestment, maturityDate: '2025-12-31' }),
    ).toMatchObject({ maturityDate: 'Maturity date cannot be before start date' });
  });

  it('accepts optional empty taxonomy and maturity values', () => {
    expect(
      validateInvestmentForm({
        ...validInvestment,
        assetTaxonomyId: '',
        maturityDate: null,
        totalInvested: '',
        currentValue: undefined,
        insuranceCover: undefined,
      }),
    ).toEqual({});
  });

  it('validates contribution dates and requires a positive amount', () => {
    expect(validateRecordContributionForm({ contributionDate: '2026-01-01', amount: '1' })).toEqual({});
    expect(validateRecordContributionForm({ contributionDate: '', amount: '0' })).toMatchObject({
      contributionDate: 'Contribution date is required',
      amount: 'Amount must be greater than 0',
    });
    expect(validateRecordContributionForm({ contributionDate: 'bad', amount: '-1' })).toMatchObject({
      contributionDate: 'Contribution date is required',
      amount: 'Amount must be greater than 0',
    });
  });

  it('enforces taxonomy hierarchy and sibling uniqueness', () => {
    const nodes = [
      { id: 'type-1', label: 'Investments', nodeType: 'type', level: 1, parentId: null },
      { id: 'cat-1', label: 'Equity', nodeType: 'category', level: 2, parentId: 'type-1' },
    ];

    expect(
      validateAssetTaxonomyForm({ ...validTaxonomy, parentId: '' }, { taxonomyNodes: nodes }),
    ).toMatchObject({ parentId: 'Parent is required for nested nodes' });
    expect(
      validateAssetTaxonomyForm(
        { ...validTaxonomy, label: ' equity ' },
        { taxonomyNodes: nodes, parentOptions: [{ value: 'type-1' }] },
      ),
    ).toMatchObject({ label: 'Label already exists under the selected parent' });
    expect(
      validateAssetTaxonomyForm(
        { ...validTaxonomy, label: ' equity ' },
        { taxonomyNodes: nodes, parentOptions: [{ value: 'type-1' }], editingNodeId: 'cat-1' },
      ),
    ).toEqual({});
  });
});