import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { IJwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import type { IActiveUser } from '../../../common/interfaces/active-user.interface';
import { UserRepository } from '../../users/repositories/user.repository';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'super-secret-meditrust-jwt-access-key-change-in-prod',
    });
  }

  async validate(payload: IJwtPayload): Promise<IActiveUser> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid JWT access token payload.',
        timestamp: new Date().toISOString(),
      });
    }

    const user = await this.userRepository.findByIdWithRole(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.UNAUTHORIZED,
        message: 'User account is inactive or no longer exists.',
        timestamp: new Date().toISOString(),
      });
    }

    const roleObj = user.roleId as unknown as { name: string; permissions: string[] };

    return {
      userId: String(user._id),
      email: user.email,
      role: roleObj.name,
      permissions: roleObj.permissions || [],
    };
  }
}
