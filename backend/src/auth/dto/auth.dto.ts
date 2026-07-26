import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

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

export class UpdateAccountProfileDto {
  @ApiPropertyOptional({ maxLength: 60, example: 'Lin' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 120, example: '在记录中遇见更好的自己' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  signature?: string;

  @ApiPropertyOptional({ enum: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] })
  @IsOptional()
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  avatarMimeType?: string;

  @ApiPropertyOptional({ description: 'Base64-encoded avatar image without a data URL prefix.', maxLength: 1_400_000 })
  @IsOptional()
  @IsString()
  @MaxLength(1_400_000)
  avatarBase64?: string;
}
