import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { addDays } from 'date-fns';
import { SessionRepository } from './repositories/session.repository';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { IJwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.isActive) {
      await this.auditService.logAction({
        action: 'LOGIN_FAILED',
        userEmail: dto.email,
        ipAddress,
        userAgent,
        status: 'FAILURE',
        metadata: { reason: 'User not found or inactive' },
      });
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
        timestamp: new Date().toISOString(),
      });
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.auditService.logAction({
        action: 'LOGIN_FAILED',
        userEmail: dto.email,
        userId: String(user._id),
        ipAddress,
        userAgent,
        status: 'FAILURE',
        metadata: { reason: 'Invalid password' },
      });
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid email or password.',
        timestamp: new Date().toISOString(),
      });
    }

    const roleObj = user.roleId as unknown as { name: string; permissions: string[] };
    const payload: IJwtPayload = {
      sub: String(user._id),
      email: user.email,
      role: roleObj.name,
      permissions: roleObj.permissions || [],
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.sessionRepository.create({
      userId: user._id as unknown as any,
      refreshTokenHash,
      ipAddress,
      userAgent,
      isValid: true,
      expiresAt: addDays(new Date(), 7),
    });

    await this.usersService.updateLastLogin(String(user._id));

    await this.auditService.logAction({
      action: 'LOGIN_SUCCESS',
      userId: String(user._id),
      userEmail: user.email,
      ipAddress,
      userAgent,
      status: 'SUCCESS',
    });

    const { passwordHash: _, ...userWithoutPass } = user.toObject();

    return {
      accessToken,
      refreshToken,
      user: userWithoutPass,
    };
  }

  async refreshTokens(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const refreshTokenHash = this.hashToken(dto.refreshToken);
    const session = await this.sessionRepository.findOne({ refreshTokenHash, isValid: true });

    if (!session) {
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Invalid or revoked refresh token.',
        timestamp: new Date().toISOString(),
      });
    }

    if (new Date() > session.expiresAt) {
      await this.sessionRepository.updateById(String(session._id), { isValid: false });
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Refresh token has expired. Please login again.',
        timestamp: new Date().toISOString(),
      });
    }

    const user = await this.usersService.getUserById(String(session.userId));
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.UNAUTHORIZED,
        message: 'User account is no longer active.',
        timestamp: new Date().toISOString(),
      });
    }

    // Rotate session: invalidate old session and issue new token pair
    await this.sessionRepository.updateById(String(session._id), { isValid: false });

    const roleObj = user.roleId as unknown as { name: string; permissions: string[] };
    const payload: IJwtPayload = {
      sub: String(user._id),
      email: user.email,
      role: roleObj.name,
      permissions: roleObj.permissions || [],
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenHash = this.hashToken(newRefreshToken);

    await this.sessionRepository.create({
      userId: user._id as unknown as any,
      refreshTokenHash: newRefreshTokenHash,
      ipAddress,
      userAgent,
      isValid: true,
      expiresAt: addDays(new Date(), 7),
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const refreshTokenHash = this.hashToken(refreshToken);
      await this.sessionRepository.updateOne({ userId, refreshTokenHash }, { isValid: false });
    } else {
      await this.sessionRepository.invalidateUserSessions(userId);
    }

    await this.auditService.logAction({
      action: 'LOGOUT',
      userId,
      status: 'SUCCESS',
    });

    return { message: 'Successfully logged out and revoked active sessions.' };
  }

  async getProfile(userId: string) {
    return this.usersService.getUserById(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByEmailWithPassword(
      (await this.usersService.getUserById(userId)).email,
    );

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.UNAUTHORIZED,
        message: 'User account not found.',
        timestamp: new Date().toISOString(),
      });
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException({
        success: false,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Current password provided is incorrect.',
        timestamp: new Date().toISOString(),
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    // Update password inside User repository
    await (this.usersService as any).userRepository.updateById(userId, { passwordHash });

    // Invalidate all active sessions for security
    await this.sessionRepository.invalidateUserSessions(userId);

    await this.auditService.logAction({
      action: 'PASSWORD_CHANGED',
      userId,
      userEmail: user.email,
      status: 'SUCCESS',
    });

    return { message: 'Password has been successfully changed. All previous sessions revoked.' };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
