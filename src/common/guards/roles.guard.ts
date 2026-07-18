import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IActiveUser } from '../interfaces/active-user.interface';
import { RoleEnum } from '../enums/role.enum';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: IActiveUser }>();
    if (!user || !user.role) {
      throw new ForbiddenException({
        success: false,
        errorCode: ERROR_CODES.FORBIDDEN,
        message: 'Access denied: user role identity missing.',
        timestamp: new Date().toISOString(),
      });
    }

    // Super Admin has unrestricted access
    if (user.role === RoleEnum.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException({
        success: false,
        errorCode: ERROR_CODES.FORBIDDEN,
        message: `Access denied: requires one of roles [${requiredRoles.join(', ')}]. Current role: ${user.role}`,
        timestamp: new Date().toISOString(),
      });
    }

    return true;
  }
}
