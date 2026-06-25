import { ApiProperty } from '@nestjs/swagger';

export class AuthUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ nullable: true, example: 'Lin' })
  displayName!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AuthTokens {
  @ApiProperty({ description: 'Short-lived JWT used as a Bearer access token.' })
  accessToken!: string;

  @ApiProperty({ description: 'Rotating JWT used only with the refresh endpoint.' })
  refreshToken!: string;
}

export class AuthResponse {
  @ApiProperty({ type: AuthUser })
  user!: AuthUser;

  @ApiProperty({ type: AuthTokens })
  tokens!: AuthTokens;
}

export class LogoutResponse {
  @ApiProperty({ example: 'Logged out.' })
  message!: string;
}

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: AccessTokenPayload;
};
