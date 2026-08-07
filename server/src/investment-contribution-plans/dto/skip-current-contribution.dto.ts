import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SkipCurrentContributionDto {
  @ApiProperty({ description: 'Optional note for why the due contribution was skipped', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}