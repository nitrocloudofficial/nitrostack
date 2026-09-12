import { Role } from '@prisma/client';

export class PermissionService {
  private roleHierarchy: Record<Role, number> = {
    EMPLOYEE: 1,
    MANAGER: 2,
    EXECUTIVE: 3,
    ADMIN: 4,
    OWNER: 5,
  };

  hasPermission(userRole: Role, requiredRole: Role): boolean {
    return this.roleHierarchy[userRole] >= this.roleHierarchy[requiredRole];
  }
}

export const permissionService = new PermissionService();
