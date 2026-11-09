import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  InvestmentActiveContributionPlanResponseDto,
  InvestmentDetailResponseDto,
  InvestmentLatestSnapshotResponseDto,
} from './investment-detail-response.dto';

function getSwaggerPropertyNames(dto: { prototype: object }): string[] {
  const properties = Reflect.getMetadata(
    'swagger/apiModelPropertiesArray',
    dto.prototype,
  ) as string[];

  return properties.map((property) => property.slice(1)).sort();
}

describe('investment-detail-response.dto', () => {
  it('documents active contribution plan and latest snapshot fields', () => {
    expect(getSwaggerPropertyNames(InvestmentActiveContributionPlanResponseDto)).toEqual([
      'amount',
      'anchorDate',
      'cadenceInterval',
      'cadenceUnit',
      'endDate',
      'historicalImportMode',
      'id',
      'nextDueDate',
      'status',
    ]);
    expect(getSwaggerPropertyNames(InvestmentLatestSnapshotResponseDto)).toEqual([
      'id',
      'marketValue',
      'price',
      'snapshotDate',
      'source',
      'units',
    ]);
  });

  it('documents investment detail fields and nullable nested schemas', () => {
    expect(getSwaggerPropertyNames(InvestmentDetailResponseDto)).toEqual([
      'accountId',
      'activeContributionPlan',
      'assetCategory',
      'assetTaxonomyId',
      'assetType',
      'contributionMode',
      'createdAt',
      'currency',
      'currentValue',
      'currentValueSource',
      'eventCount',
      'id',
      'institutionName',
      'insuranceCover',
      'lastValuationAt',
      'latestSnapshot',
      'maturityDate',
      'name',
      'notes',
      'realizedAmount',
      'realizedProfitLoss',
      'realizedProfitLossPercentage',
      'referenceNumber',
      'snapshotCount',
      'startDate',
      'status',
      'totalInvested',
      'updatedAt',
    ]);

    expect(
      Reflect.getMetadata(
        'swagger/apiModelProperties',
        InvestmentDetailResponseDto.prototype,
        'activeContributionPlan',
      ),
    ).toMatchObject({ type: InvestmentActiveContributionPlanResponseDto, nullable: true });
    expect(
      Reflect.getMetadata(
        'swagger/apiModelProperties',
        InvestmentDetailResponseDto.prototype,
        'latestSnapshot',
      ),
    ).toMatchObject({ type: InvestmentLatestSnapshotResponseDto, nullable: true });
  });
});