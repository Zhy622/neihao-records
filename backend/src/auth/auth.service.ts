import {
  ConflictException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RefreshToken, User } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, UpdateAccountProfileDto } from './dto/auth.dto';
import { hashPassword, verifyPassword } from './password-hash';
import {
  AccessTokenPayload,
  AuthResponse,
  AuthTokens,
  AuthUser,
  AccountProfileResponse,
  RefreshTokenPayload,
} from './auth.types';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const REFRESH_TOKEN_DAYS = 30;
const MAX_AVATAR_BYTES = 1024 * 1024;

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

  async getProfile(userId: string): Promise<AccountProfileResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toAccountProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateAccountProfileDto): Promise<AccountProfileResponse> {
    const avatar = this.parseAvatar(dto);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName === undefined ? undefined : dto.displayName.trim() || null,
        signature: dto.signature === undefined ? undefined : dto.signature.trim(),
        avatarData: avatar ? new Uint8Array(avatar.data) : undefined,
        avatarMimeType: avatar?.mimeType,
      },
    });

    return this.toAccountProfile(user);
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

  private toAccountProfile(user: User): AccountProfileResponse {
    return {
      displayName: user.displayName,
      signature: user.signature,
      avatarDataUrl: user.avatarData && user.avatarMimeType
        ? `data:${user.avatarMimeType};base64,${Buffer.from(user.avatarData).toString('base64')}`
        : null,
      updatedAt: user.updatedAt,
    };
  }

  private parseAvatar(dto: UpdateAccountProfileDto): { data: Buffer; mimeType: string } | undefined {
    if (dto.avatarBase64 === undefined && dto.avatarMimeType === undefined) {
      return undefined;
    }
    if (!dto.avatarBase64 || !dto.avatarMimeType) {
      throw new BadRequestException('Avatar data and MIME type must be provided together.');
    }

    const base64 = dto.avatarBase64.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      throw new BadRequestException('Avatar must be valid base64.');
    }
    const data = Buffer.from(base64, 'base64');
    if (!data.length || data.length > MAX_AVATAR_BYTES || !this.matchesAvatarMimeType(data, dto.avatarMimeType)) {
      throw new BadRequestException('Avatar must be a supported image smaller than 1 MB.');
    }

    return { data, mimeType: dto.avatarMimeType };
  }

  private matchesAvatarMimeType(data: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/jpeg') {
      return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/webp') {
      return data.length >= 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
    }
    return data.length >= 12 && data.subarray(4, 8).toString() === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1'].includes(data.subarray(8, 12).toString());
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
