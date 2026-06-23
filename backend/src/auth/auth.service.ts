import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RefreshToken, User } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { hashPassword, verifyPassword } from './password-hash';
import {
  AccessTokenPayload,
  AuthResponse,
  AuthTokens,
  AuthUser,
  RefreshTokenPayload,
} from './auth.types';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const REFRESH_TOKEN_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: dto.displayName?.trim() || null,
        },
      });

      return this.buildAuthResponse(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email is already registered.');
      }

      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    await this.revokeRefreshToken(storedToken);

    return this.buildAuthResponse(storedToken.user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { message: 'Logged out.' };
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const tokens = await this.issueTokens(user);

    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(this.buildAccessTokenPayload(user), {
      secret: this.getRequiredConfig('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
    const refreshToken = await this.createRefreshToken(user);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: this.getRefreshTokenExpiresAt(),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async revokeRefreshToken(refreshToken: RefreshToken): Promise<void> {
    await this.prisma.refreshToken.update({
      where: {
        id: refreshToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private buildAccessTokenPayload(user: User): AccessTokenPayload {
    return {
      sub: user.id,
      email: user.email,
    };
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private createRefreshToken(user: User): Promise<string> {
    return this.jwtService.signAsync(this.buildRefreshTokenPayload(user), {
      secret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private buildRefreshTokenPayload(user: User): RefreshTokenPayload {
    return {
      sub: user.id,
      jti: randomUUID(),
    };
  }

  private getRefreshTokenExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    return expiresAt;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured.`);
    }

    return value;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
