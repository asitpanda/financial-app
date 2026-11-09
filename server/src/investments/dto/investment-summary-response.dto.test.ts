import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { PaginationMetaDto } from '../../common/listing/pagination-meta.dto';
import { InvestmentActiveContributionPlanResponseDto } from './investment-detail-response.dto';
import {
  InvestmentSummaryPageResponseDto,
  InvestmentSummaryResponseDto,
} from './investment-summary-response.dto';

function getSwaggerPropertyNames(dto: { prototype: object }): string[] {
  const properties = Reflect.getMetadata(
    'swagger/apiModelPropertiesArray',
    dto.prototype,
  ) as string[];

  return properties.map((property) => property.slice(1)).sort();
}

describe('investment-summary-response.dto', () => {
  it('documents investment summary fields and the optional contribution plan', () => {
    expect(getSwaggerPropertyNames(InvestmentSummaryResponseDto)).toEqual([
      'activeContributionPlan',
      'assetCategory',
      'assetType',
      'currency',
      'currentValue',
      'currentValueSource',
      'gainLossAmount',
      'gainLossPercentage',
      'id',
      'institutionName',
      'lastValuationAt',
      'maturityDate',
      'name',
      'status',
      'totalInvested',
    ]);
    const contributionPlanMetadata = Reflect.getMetadata(
      'swagger/apiModelProperties',
      InvestmentSummaryResponseDto.prototype,
      'activeContributionPlan',
    );

    expect(contributionPlanMetadata.type).toBe(InvestmentActiveContributionPlanResponseDto);
    expect(contributionPlanMetadata.nullable).toBe(true);
  });

  it('documents page data and pagination schemas', () => {
    expect(getSwaggerPropertyNames(InvestmentSummaryPageResponseDto)).toEqual([
      'data',
      'pagination',
    ]);
    const dataMetadata = Reflect.getMetadata(
      'swagger/apiModelProperties',
      InvestmentSummaryPageResponseDto.prototype,
      'data',
    );

    expect(dataMetadata.type).toBe(InvestmentSummaryResponseDto);
    expect(dataMetadata.isArray).toBe(true);
    const paginationMetadata = Reflect.getMetadata(
      'swagger/apiModelProperties',
      InvestmentSummaryPageResponseDto.prototype,
      'pagination',
    );

    expect(paginationMetadata.type).toBe(PaginationMetaDto);
    expect(paginationMetadata.isArray).toBe(false);
  });
});