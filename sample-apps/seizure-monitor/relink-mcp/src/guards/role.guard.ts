import { type ExecutionContext, type Guard } from '@nitrostack/core';

export class RoleGuard implements Guard {
  constructor(private readonly allowedRoles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const scopes = (context.auth?.scopes as string[]) || [];

    if (this.allowedRoles.length === 0) return true;

    return this.allowedRoles.some((role) => scopes.includes(role));
  }
}
