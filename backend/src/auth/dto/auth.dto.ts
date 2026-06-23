import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
