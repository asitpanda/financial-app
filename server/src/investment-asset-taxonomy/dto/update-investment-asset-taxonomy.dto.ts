import { PartialType } from '@nestjs/swagger';
import { CreateInvestmentAssetTaxonomyDto } from './create-investment-asset-taxonomy.dto';

export class UpdateInvestmentAssetTaxonomyDto extends PartialType(CreateInvestmentAssetTaxonomyDto) {}