import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ format: 'email', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, writeOnly: true, example: 'secure-pass-123' })
  @IsString()
  @Length(8, 72)
  password!: string;

  @ApiPropertyOptional({ maxLength: 60, example: 'Lin' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ format: 'email', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, writeOnly: true, example: 'secure-pass-123' })
  @IsString()
  @Length(8, 72)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token returned by register, login, or refresh.' })
  @IsString()
  refreshToken!: string;
}
