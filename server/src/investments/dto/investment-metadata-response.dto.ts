import { ApiProperty } from '@nestjs/swagger';

export class InvestmentMetadataAssetCategoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ required: false, enum: ['INVESTMENT', 'INSURANCE_SAVINGS', 'PROTECTION_EXPENSE'] })
  accountingTreatment?: string | null;
}

export class InvestmentMetadataAssetTypeDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ required: false, enum: ['INVESTMENT', 'INSURANCE_SAVINGS', 'PROTECTION_EXPENSE'] })
  accountingTreatment?: string | null;

  @ApiProperty({ type: [InvestmentMetadataAssetCategoryDto] })
  categories: InvestmentMetadataAssetCategoryDto[];
}

export class InvestmentMetadataResponseDto {
  @ApiProperty({ type: [InvestmentMetadataAssetTypeDto] })
  asset_configs: InvestmentMetadataAssetTypeDto[];
}