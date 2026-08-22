import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFinancialAccountDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  displayName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accountType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountNumberMasked?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, default: 0, description: 'Money already present in the account when it was added; not an INCOME transaction' })
  @IsOptional()
  @IsNumber()
  openingBalance?: number;
}