import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { LockerFieldDto } from './locker-field.dto';

export class CreateLockerEntityDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ type: LockerFieldDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LockerFieldDto)
  fields: LockerFieldDto[];
}
