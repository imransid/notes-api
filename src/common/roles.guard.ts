import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../users/user.schema.js';
import { ROLES_KEY } from './decorators.js';
import type { JwtPayload } from './jwt-auth.guard.js';

// Runs after JwtAuthGuard. Routes without @Roles are open to any logged-in user.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    return roles.includes(user.role);
  }
}
