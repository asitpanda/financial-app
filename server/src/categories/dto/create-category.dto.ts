import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Category type', enum: ['income', 'expense'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['income', 'expense'])
  type: string;

  @ApiProperty({ description: 'Icon identifier', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Color hex code', required: false })
  @IsOptional()
  @IsString()
  color?: string;
}
