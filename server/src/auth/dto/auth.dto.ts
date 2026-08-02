import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User ID (unique identifier)', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'userId can only contain letters, numbers, dot, underscore, and hyphen',
  })
  userId?: string;

  @ApiProperty({ description: 'Mobile number', required: false })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  @Matches(/^\+?[0-9]+$/, {
    message: 'mobile must contain only digits and optional leading +',
  })
  mobile?: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'User name', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class LoginDto {
  @ApiProperty({ 
    description: 'User identifier (email, userId, or mobile number)',
    example: 'demo@example.com or demo123 or +1234567890'
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
