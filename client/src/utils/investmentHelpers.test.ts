import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  buildAssetCategoryLabelMap,
  buildAssetTypeLabelMap,
  buildFormFromInvestment,
  buildInvestmentFromForm,
  cadenceToFrequency,
  createEmptyInvestmentForm,
  formatInvestmentCurrency,
  formatInvestmentDate,
  getCadenceLabel,
  getInvestmentCategoryLabel,
  getInvestmentCategoryOptions,
  getInvestmentStatusTone,
  getInvestmentTypeDisplayLabel,
  getInvestmentTypeLabel,
  getInvestmentTypeMeta,
  getInvestmentTypeTreeItems,
  getTaxonomyById,
  normalizeInvestmentForUi,
} from './investmentHelpers';

const taxonomyNodes = [
  { id: 'long-term', label: 'Long Term Savings', nodeType: 'category', level: 1, sortOrder: 2 },
  { id: 'equity', label: 'Equity', nodeType: 'type', level: 2, parentId: 'long-term', sortOrder: 1 },
  { id: 'mutual-funds', label: 'Mutual Funds', nodeType: 'subtype', level: 3, parentId: 'equity', sortOrder: 1 },
  { id: 'alternatives', label: 'Alternative Assets', nodeType: 'category', level: 1, sortOrder: 1 },
  { id: 'hidden', label: 'Hidden', nodeType: 'category', level: 1, isActive: false },
];

const investmentForm = {
  accountId: '7',
  assetTaxonomyId: 'mutual-funds',
  name: '  Growth Fund  ',
  type: 'mutual_fund',
  category: 'equity',
  institution: ' Example Brokerage ',
  totalInvested: '1500',
  currentValue: '',
  currency: 'USD',
  startDate: '2026-02-03',
  status: 'active',
  maturityDate: 'invalid',
  insuranceCover: '25000',
  contributionType: 'recurring',
  referenceNumber: ' REF-1 ',
  notes: ' retirement savings ',
  expectedBenefits: [
    { benefitType: 'MATURITY', amount: '3000', benefitDate: '2027-02-03', notes: 'Maturity benefit' },
  ],
};

describe('investmentHelpers', () => {
  it.each([
    ['week', 1, 'weekly', 'Weekly'],
    ['month', 1, 'monthly', 'Monthly'],
    ['quarter', 1, 'quarterly', 'Quarterly'],
    ['month', 6, 'halfyearly', 'Half-yearly'],
    ['year', 1, 'yearly', 'Yearly'],
  ])('maps the %s cadence to its edit-form frequency and label', (unit, interval, frequency, label) => {
    expect(cadenceToFrequency(unit, interval)).toBe(frequency);
    expect(getCadenceLabel(unit, interval)).toBe(label);
  });

  it('uses defaults and readable labels for missing or unsupported cadences', () => {
    expect(cadenceToFrequency('month', 3)).toBe('monthly');
    expect(cadenceToFrequency(null, null)).toBe('monthly');
    expect(getCadenceLabel()).toBe('—');
    expect(getCadenceLabel('day', 1)).toBe('Every 1 day');
    expect(getCadenceLabel('month', 3)).toBe('Every 3 months');
    expect(getCadenceLabel('month', 0)).toBe('Monthly');
  });

  it.each([
    ['active', 'success'],
    ['matured', 'warning'],
    ['closed', 'default'],
    ['unknown', 'default'],
  ])('maps %s investment status to its display tone', (status, tone) => {
    expect(getInvestmentStatusTone(status)).toBe(tone);
  });

  it('formats currency and dates with the requested display preferences', () => {
    expect(formatInvestmentCurrency(1250, 'USD', 'code')).toContain('USD');
    expect(formatInvestmentDate('2026-02-10')).toBe('10/02/2026');
    expect(formatInvestmentDate('2026-02-10', 'YYYY_MM_DD')).toBe('2026-02-10');
    expect(formatInvestmentDate('invalid')).toBe('Not set');
    expect(formatInvestmentDate(null)).toBe('Not set');
  });

  it('returns active taxonomy categories sorted and slugged', () => {
    expect(getTaxonomyById(taxonomyNodes)).not.toHaveProperty('hidden');
    expect(getInvestmentCategoryOptions(taxonomyNodes)).toEqual([
      { value: 'all', label: 'All Categories' },
      { value: 'alternative_assets', label: 'Alternative Assets' },
      { value: 'long_term_savings', label: 'Long Term Savings' },
    ]);
  });

  it('builds the active taxonomy tree and resolves IDs or labels to full paths', () => {
    expect(getInvestmentTypeTreeItems(taxonomyNodes)).toEqual([
      { id: 'alternatives', label: 'Alternative Assets', level: 1, children: [] },
      {
        id: 'long-term',
        label: 'Long Term Savings',
        level: 1,
        children: [{
          id: 'equity',
          label: 'Equity',
          level: 2,
          children: [{ id: 'mutual-funds', label: 'Mutual Funds', level: 3, children: [] }],
        }],
      },
    ]);
    expect(getInvestmentTypeDisplayLabel('mutual-funds', taxonomyNodes))
      .toBe('Long Term Savings / Equity / Mutual Funds');
    expect(getInvestmentTypeDisplayLabel(' equity ', taxonomyNodes))
      .toBe('Long Term Savings / Equity');
    expect(getInvestmentTypeDisplayLabel('missing', taxonomyNodes)).toBe('');
  });

  it('resolves taxonomy metadata and readable category/type labels', () => {
    expect(getInvestmentTypeMeta('mutual-funds', taxonomyNodes)).toEqual({
      id: 'mutual-funds',
      type: 'Mutual Funds',
      category: 'long_term_savings',
      categoryLabel: 'Long Term Savings',
    });
    expect(getInvestmentTypeMeta('missing')).toEqual({
      id: null,
      type: 'missing',
      category: 'other',
      categoryLabel: 'Other',
    });
    expect(getInvestmentCategoryLabel('long_term_savings', taxonomyNodes)).toBe('Long Term Savings');
    expect(getInvestmentCategoryLabel('fixed_income')).toBe('Fixed Income');
    expect(getInvestmentCategoryLabel('')).toBe('Other');
    expect(getInvestmentTypeLabel('mutual_fund')).toBe('Mutual Fund');
    expect(getInvestmentTypeLabel('')).toBe('Other');
  });

  it('builds asset type and category label maps from metadata', () => {
    const configs = [{
      code: 'mutual_fund',
      label: 'Mutual Funds',
      categories: [{ code: 'equity', label: 'Equity' }],
    }];

    expect(buildAssetTypeLabelMap(configs)).toEqual({ mutual_fund: 'Mutual Funds' });
    expect(buildAssetCategoryLabelMap(configs)).toEqual({ equity: 'Equity' });
  });

  it('normalizes summary data using taxonomy and institution fallbacks', () => {
    expect(normalizeInvestmentForUi({
      id: 'investment-1',
      name: 'Growth Fund',
      assetTaxonomyId: 'mutual-funds',
      institutionName: 'Example Brokerage',
    }, taxonomyNodes)).toMatchObject({
      accountId: null,
      type: 'Mutual Funds',
      assetTaxonomyId: 'mutual-funds',
      category: 'long_term_savings',
      institution: 'Example Brokerage',
    });
  });

  it('creates an empty investment form with valid date defaults', () => {
    const form = createEmptyInvestmentForm();

    expect(form).toMatchObject({
      accountId: '',
      name: '',
      type: '',
      category: '',
      assetTaxonomyId: null,
      totalInvested: '',
      currentValue: '',
      status: 'active',
      maturityDate: null,
    });
    expect(dayjs(form.startDate).isValid()).toBe(true);
  });

  it('seeds an edit form from stored investment values and taxonomy', () => {
    const form = buildFormFromInvestment({
      accountId: 7,
      assetTaxonomyId: 'mutual-funds',
      totalInvested: 0,
      currentValue: 0,
      startDate: '2026-02-03',
      maturityDate: '2027-02-03',
      insuranceCover: 0,
      status: 'matured',
      institutionName: 'Example Brokerage',
    }, taxonomyNodes);

    expect(form).toMatchObject({
      accountId: '7',
      currency: 'INR',
      type: 'Mutual Funds',
      category: '',
      totalInvested: '',
      currentValue: '0',
      status: 'matured',
      insuranceCover: '',
      institution: 'Example Brokerage',
    });
    expect(form.startDate.format('YYYY-MM-DD')).toBe('2026-02-03');
    expect(form.maturityDate?.format('YYYY-MM-DD')).toBe('2027-02-03');
  });

  it('builds a normalized create payload using the selected account and valid benefits', () => {
    const payload = buildInvestmentFromForm(investmentForm, null, taxonomyNodes, [
      { id: 7, currency: 'CAD' },
    ]);

    expect(payload).toMatchObject({
      accountId: 7,
      assetTaxonomyId: 'mutual-funds',
      name: 'Growth Fund',
      assetType: 'mutual_fund',
      assetCategory: 'equity',
      institutionName: 'Example Brokerage',
      totalInvested: 1500,
      currentValue: undefined,
      currency: 'CAD',
      currentValueSource: 'manual',
      status: 'active',
      maturityDate: null,
      insuranceCover: 25000,
      contributionMode: 'RECURRING',
      referenceNumber: 'REF-1',
      notes: 'retirement savings',
      expectedBenefits: [{
        benefitType: 'MATURITY',
        amount: 3000,
        benefitDate: '2027-02-03',
        notes: 'Maturity benefit',
      }],
    });
    expect(payload.startDate).toBe('2026-02-03');
    expect(payload.lastValuationAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('omits create-only values when building an existing investment update', () => {
    const payload = buildInvestmentFromForm(investmentForm, 'investment-1', [], []);

    expect(payload).toMatchObject({ accountId: 7, name: 'Growth Fund' });
    expect(payload).not.toHaveProperty('totalInvested');
    expect(payload).not.toHaveProperty('currentValue');
    expect(payload).not.toHaveProperty('currency');
    expect(payload).not.toHaveProperty('currentValueSource');
    expect(payload).not.toHaveProperty('lastValuationAt');
    expect(payload.expectedBenefits).toBeUndefined();
  });
});