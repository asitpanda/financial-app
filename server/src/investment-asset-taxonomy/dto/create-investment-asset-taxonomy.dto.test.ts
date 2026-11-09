import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateInvestmentAssetTaxonomyDto } from './create-investment-asset-taxonomy.dto';

const validTaxonomy = {
  label: 'Portfolio',
  nodeType: 'CATEGORY',
  level: 1,
};

describe('CreateInvestmentAssetTaxonomyDto', () => {
  it('transforms numeric fields and accepts valid optional metadata', () => {
    const taxonomy = plainToInstance(CreateInvestmentAssetTaxonomyDto, {
      ...validTaxonomy,
      level: '5',
      parentId: '4',
      defaultAssetType: 'EQUITY',
      defaultAssetCategory: 'STOCK',
      sortOrder: '0',
      isActive: false,
    });

    expect(taxonomy).toMatchObject({ level: 5, parentId: 4, sortOrder: 0, isActive: false });
    expect(validateSync(taxonomy)).toEqual([]);
  });

  it.each([1, 5])('accepts the level boundary %i', (level) => {
    const taxonomy = plainToInstance(CreateInvestmentAssetTaxonomyDto, { ...validTaxonomy, level });

    expect(validateSync(taxonomy)).toEqual([]);
  });

  it.each([
    { label: '' },
    { label: 12 },
    { nodeType: '' },
    { nodeType: 12 },
  ])('rejects invalid required text fields: %o', (overrides) => {
    const taxonomy = plainToInstance(CreateInvestmentAssetTaxonomyDto, {
      ...validTaxonomy,
      ...overrides,
    });

    expect(validateSync(taxonomy).length).toBeGreaterThan(0);
  });

  it.each([0, 6, 1.5, 'not-a-number'])('rejects an invalid taxonomy level: %s', (level) => {
    const taxonomy = plainToInstance(CreateInvestmentAssetTaxonomyDto, { ...validTaxonomy, level });

    expect(validateSync(taxonomy).length).toBeGreaterThan(0);
  });

  it.each([
    { parentId: 'not-a-number' },
    { sortOrder: -1 },
    { sortOrder: 'not-a-number' },
    { defaultAssetType: 12 },
    { defaultAssetCategory: 12 },
    { isActive: 'true' },
  ])('rejects invalid optional taxonomy fields: %o', (overrides) => {
    const taxonomy = plainToInstance(CreateInvestmentAssetTaxonomyDto, {
      ...validTaxonomy,
      ...overrides,
    });

    expect(validateSync(taxonomy).length).toBeGreaterThan(0);
  });
});