import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(err: unknown, user: unknown, _info: unknown): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        success: false,
        errorCode: ERROR_CODES.UNAUTHORIZED,
        message: 'Unauthorized access. Valid bearer token is required.',
        timestamp: new Date().toISOString(),
      });
    }
    return user as TUser;
  }
}
