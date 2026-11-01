import { IsIn, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { CurrencyDisplay, ThemeMode, DateFormat } from '../user-preferences.types';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ enum: ['symbol', 'code'] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['symbol', 'code'])
  currencyDisplay?: CurrencyDisplay;

  @ApiPropertyOptional({ enum: ['light', 'dark'] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['light', 'dark'])
  themeMode?: ThemeMode;

  @ApiPropertyOptional({ enum: ['DD_MM_YYYY', 'MM_DD_YYYY', 'YYYY_MM_DD', 'DD_MMM_YYYY'] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['DD_MM_YYYY', 'MM_DD_YYYY', 'YYYY_MM_DD', 'DD_MMM_YYYY'])
  dateFormat?: DateFormat;
}