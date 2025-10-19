import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../../auth/decorators/permissions.decorator";
import { OrganizationPermission, OrganizationRole } from "../../database/types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      OrganizationPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const membership = request["tenantMembership"];

    if (!membership) {
      throw new ForbiddenException("No tenant membership found");
    }

    // Owners have all permissions
    if (membership.role === OrganizationRole.OWNER) {
      return true;
    }

    // Admins have all permissions except owner-specific ones
    if (membership.role === OrganizationRole.ADMIN) {
      return true;
    }

    // Check for specific permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      membership.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
