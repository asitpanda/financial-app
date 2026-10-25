import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListQueryDto } from '../../common/listing/list-query.dto';
import type { InvestmentListQuery, InvestmentListSortField } from '../investment.types';

export const INVESTMENT_LIST_SORT_FIELDS: readonly InvestmentListSortField[] = [
  'name',
  'currentValue',
  'totalInvested',
  'maturityDate',
  'startDate',
  'createdAt',
  'lastValuationAt',
  'assetType',
  'assetCategory',
] as const;

export class InvestmentListQueryDto extends ListQueryDto implements InvestmentListQuery {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'matured', 'closed'] })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'matured', 'closed'])
  @MaxLength(40)
  status?: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  assetType?: string;

  @ApiPropertyOptional({ enum: ['INVESTMENT', 'INSURANCE_SAVINGS', 'PROTECTION_EXPENSE'] })
  @IsOptional()
  @IsString()
  @IsIn(['INVESTMENT', 'INSURANCE_SAVINGS', 'PROTECTION_EXPENSE'])
  @MaxLength(60)
  accountingTreatment?: InvestmentListQuery['accountingTreatment'];

  @ApiPropertyOptional({ type: Number, isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((item) => Number(item.trim())) : value,
  )
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[];

  @ApiPropertyOptional({ enum: INVESTMENT_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(INVESTMENT_LIST_SORT_FIELDS)
  sortBy?: InvestmentListSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}