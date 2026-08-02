import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { PreviewRecurringContributionPlanDto } from './preview-recurring-contribution-plan.dto';
import { HistoricalContributionItemDto } from './historical-contribution-item.dto';

export class CreateRecurringContributionPlanDto extends OmitType(PreviewRecurringContributionPlanDto, [
  'investmentId',
] as const) {
  @ApiProperty({ type: [HistoricalContributionItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => HistoricalContributionItemDto)
  reviewedHistoricalItems?: HistoricalContributionItemDto[];
}
