import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  InvestmentDashboardSummaryDto,
  InvestmentValueSourceSummaryDto,
} from './dashboard-analytics-response.dto';

function getSwaggerPropertyNames(dto: { prototype: object }): string[] {
  const properties = Reflect.getMetadata(
    'swagger/apiModelPropertiesArray',
    dto.prototype,
  ) as string[];

  return properties.map((property) => property.slice(1)).sort();
}

describe('dashboard-analytics-response.dto', () => {
  it('documents every value-source summary property', () => {
    expect(getSwaggerPropertyNames(InvestmentValueSourceSummaryDto)).toEqual([
      'estimatedCount',
      'estimatedIds',
      'estimatedValue',
      'insuranceSavingsWithValueCount',
      'insuranceSavingsWithValueIds',
      'insuranceSavingsWithValueValue',
      'insuranceSavingsWithoutValueCount',
      'insuranceSavingsWithoutValueIds',
      'investedOnlyCount',
      'investedOnlyIds',
      'investedOnlyValue',
      'snapshotBackedCount',
      'snapshotBackedIds',
      'snapshotBackedValue',
      'staleValuationCount',
      'staleValuationIds',
      'staleValuationValue',
    ]);

    for (const property of [
      'snapshotBackedIds',
      'estimatedIds',
      'investedOnlyIds',
      'staleValuationIds',
      'insuranceSavingsWithValueIds',
      'insuranceSavingsWithoutValueIds',
    ]) {
      expect(
        Reflect.getMetadata(
          'swagger/apiModelProperties',
          InvestmentValueSourceSummaryDto.prototype,
          property,
        ),
      ).toMatchObject({ type: String, isArray: true });
    }
  });

  it('documents dashboard summary fields and its nested value-source schema', () => {
    expect(getSwaggerPropertyNames(InvestmentDashboardSummaryDto)).toEqual([
      'insuranceCover',
      'insuranceCoverProtection',
      'insuranceCoverSavings',
      'insuranceSavingsContribution',
      'protectionExpenseTotal',
      'returnPercentage',
      'totalContributions',
      'totalCurrentValue',
      'totalCurrentValueFromInsuranceSavings',
      'totalInvested',
      'totalInvestments',
      'totalReturn',
      'upcomingMaturity',
      'upcomingMaturityFromInsuranceSavings',
      'valueSourceSummary',
    ]);

    expect(
      Reflect.getMetadata(
        'swagger/apiModelProperties',
        InvestmentDashboardSummaryDto.prototype,
        'valueSourceSummary',
      ),
    ).toMatchObject({ type: InvestmentValueSourceSummaryDto });
  });
});