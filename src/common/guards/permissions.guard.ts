import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IActiveUser } from '../interfaces/active-user.interface';
import { RoleEnum } from '../enums/role.enum';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: IActiveUser }>();
    if (!user || !user.permissions) {
      throw new ForbiddenException({
        success: false,
        errorCode: ERROR_CODES.FORBIDDEN,
        message: 'Access denied: user permissions missing.',
        timestamp: new Date().toISOString(),
      });
    }

    if (user.role === RoleEnum.ADMIN) {
      return true;
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        success: false,
        errorCode: ERROR_CODES.FORBIDDEN,
        message: `Access denied: missing required permissions [${requiredPermissions.join(', ')}]`,
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  }
}
