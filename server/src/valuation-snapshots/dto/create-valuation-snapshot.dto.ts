import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IsNotFutureDate } from '../../common/validators/is-not-future-date.validator';

export class CreateValuationSnapshotDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  @IsNotFutureDate()
  snapshotDate: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  marketValue: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  units?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;
}