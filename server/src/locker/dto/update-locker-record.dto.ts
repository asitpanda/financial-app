import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateLockerRecordDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @ApiProperty({ type: 'object', additionalProperties: { nullable: true, type: 'string' }, required: false })
  @IsOptional()
  @IsObject()
  values?: Record<string, string | null>;
}
