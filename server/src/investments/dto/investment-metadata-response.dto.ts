import { ApiProperty } from '@nestjs/swagger';

export class InvestmentMetadataAssetCategoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;
}

export class InvestmentMetadataAssetTypeDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ type: [InvestmentMetadataAssetCategoryDto] })
  categories: InvestmentMetadataAssetCategoryDto[];
}

export class InvestmentMetadataResponseDto {
  @ApiProperty({ type: [InvestmentMetadataAssetTypeDto] })
  asset_configs: InvestmentMetadataAssetTypeDto[];
}