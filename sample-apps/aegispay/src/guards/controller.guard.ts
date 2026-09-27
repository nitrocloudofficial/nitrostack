// controller.guard.ts — Enforces the 'controller' role. Runs AFTER JWTGuard
// in the @UseGuards chain (guards execute in the order passed), so
// context.auth is already the verified AuthContext attached by JWTGuard.
// This is the second half of the trust boundary for execute_payment — see
// CLAUDE.md §1/§2 rule 14. There is no bypass flag and none should ever be
// added here.

import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import type { AuthContext } from '../types/contracts.js';
import { AuditService } from '../services/audit.service.js';

@Injectable({ deps: [AuditService] })
export class ControllerGuard implements Guard {
  // Constructor intentionally typed as `(...args: unknown[])` rather than
  // `(auditService: AuditService)` so this class remains structurally
  // assignable to the SDK's `GuardConstructor` type under `strict` mode —
  // same workaround as JWTGuard. Runtime resolution reads `deps:
  // [AuditService]` from the `@Injectable` metadata above.
  private auditService: AuditService;

  constructor(...args: unknown[]) {
    this.auditService = args[0] as AuditService;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const auth = context.auth as AuthContext | undefined;
    if (auth?.role === 'controller') {
      return true;
    }

    this.auditService.log({
      tool: context.toolName ?? 'unknown',
      subject: auth?.subject ?? null,
      outcome: 'blocked',
      reason: 'controller role required',
    });
    return false;
  }
}
