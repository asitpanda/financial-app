import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import type { LockerFieldType } from '../locker.types';
import { LockerFieldOptionDto } from './locker-field-option.dto';

export class LockerFieldDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  uid?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: ['text', 'password', 'number', 'select', 'date'] })
  @IsIn(['text', 'password', 'number', 'select', 'date'])
  type: LockerFieldType;

  @ApiProperty()
  @IsBoolean()
  masked: boolean;

  @ApiProperty({ type: LockerFieldOptionDto, isArray: true, required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LockerFieldOptionDto)
  options?: LockerFieldOptionDto[];
}
