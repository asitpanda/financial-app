import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  InvestmentPerformanceHistoryPointResponseDto,
  InvestmentPerformanceResponseDto,
} from './investment-performance-response.dto';

function getSwaggerPropertyNames(dto: { prototype: object }): string[] {
  const properties = Reflect.getMetadata(
    'swagger/apiModelPropertiesArray',
    dto.prototype,
  ) as string[];

  return properties.map((property) => property.slice(1)).sort();
}

describe('investment-performance-response.dto', () => {
  it('documents all performance history point fields', () => {
    expect(getSwaggerPropertyNames(InvestmentPerformanceHistoryPointResponseDto)).toEqual([
      'currentValue',
      'date',
      'eventType',
      'gainLossPercentage',
      'gainLossValue',
      'investedValue',
      'source',
    ]);
  });

  it('documents the response and its history item schema', () => {
    expect(getSwaggerPropertyNames(InvestmentPerformanceResponseDto)).toEqual([
      'investmentId',
      'performanceHistory',
      'performanceHistorySource',
    ]);
    const historyMetadata = Reflect.getMetadata(
      'swagger/apiModelProperties',
      InvestmentPerformanceResponseDto.prototype,
      'performanceHistory',
    );

    expect(historyMetadata.type).toBe(InvestmentPerformanceHistoryPointResponseDto);
    expect(historyMetadata.isArray).toBe(true);
    expect(
      Reflect.getMetadata(
        'swagger/apiModelProperties',
        InvestmentPerformanceResponseDto.prototype,
        'performanceHistorySource',
      ),
    ).toMatchObject({ nullable: true });
  });
});