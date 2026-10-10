import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';

export class CreateLockerRecordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  entityUid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ type: 'object', additionalProperties: { nullable: true, type: 'string' } })
  @IsObject()
  values: Record<string, string | null>;
}
