import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateValuationSnapshotDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  investmentId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
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