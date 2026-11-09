import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  InvestmentMetadataAssetCategoryDto,
  InvestmentMetadataAssetTypeDto,
  InvestmentMetadataResponseDto,
} from './investment-metadata-response.dto';

function getSwaggerPropertyNames(dto: { prototype: object }): string[] {
  const properties = Reflect.getMetadata(
    'swagger/apiModelPropertiesArray',
    dto.prototype,
  ) as string[];

  return properties.map((property) => property.slice(1)).sort();
}

describe('investment-metadata-response.dto', () => {
  it('documents asset category and asset type metadata fields', () => {
    expect(getSwaggerPropertyNames(InvestmentMetadataAssetCategoryDto)).toEqual([
      'accountingTreatment',
      'code',
      'id',
      'label',
    ]);
    expect(getSwaggerPropertyNames(InvestmentMetadataAssetTypeDto)).toEqual([
      'accountingTreatment',
      'categories',
      'code',
      'id',
      'label',
    ]);
    expect(
      Reflect.getMetadata(
        'swagger/apiModelProperties',
        InvestmentMetadataAssetCategoryDto.prototype,
        'accountingTreatment',
      ),
    ).toMatchObject({
      required: false,
      enum: ['INVESTMENT', 'INSURANCE_SAVINGS', 'PROTECTION_EXPENSE'],
    });
  });

  it('documents nested categories and the top-level asset configuration list', () => {
    expect(getSwaggerPropertyNames(InvestmentMetadataResponseDto)).toEqual(['asset_configs']);
    const categoriesMetadata = Reflect.getMetadata(
      'swagger/apiModelProperties',
      InvestmentMetadataAssetTypeDto.prototype,
      'categories',
    );
    const assetConfigsMetadata = Reflect.getMetadata(
      'swagger/apiModelProperties',
      InvestmentMetadataResponseDto.prototype,
      'asset_configs',
    );

    expect(categoriesMetadata.type).toBe(InvestmentMetadataAssetCategoryDto);
    expect(categoriesMetadata.isArray).toBe(true);
    expect(assetConfigsMetadata.type).toBe(InvestmentMetadataAssetTypeDto);
    expect(assetConfigsMetadata.isArray).toBe(true);
  });
});