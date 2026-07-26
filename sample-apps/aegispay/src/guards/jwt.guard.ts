// jwt.guard.ts — Verifies a bearer JWT and attaches an AuthContext to the
// execution context. This is a trust boundary: everything below this guard
// treats context.auth as verified. There is no bypass flag and none should
// ever be added here — see CLAUDE.md §1/§2 rule 14.

import { Guard, ExecutionContext, Injectable, verifyJWT } from '@nitrostack/core';
import type { AuthContext } from '../types/contracts.js';
import { AuditService } from '../services/audit.service.js';

@Injectable({ deps: [AuditService] })
export class JWTGuard implements Guard {
  // Constructor is intentionally typed as `(...args: unknown[])` rather than
  // `(auditService: AuditService)` so this class remains structurally
  // assignable to the SDK's `GuardConstructor` type
  // (`new (...args: unknown[]) => Guard`) under `strict` mode. Runtime
  // resolution is unaffected: the DI container reads `deps: [AuditService]`
  // from the `@Injectable` metadata above and positionally injects the
  // resolved `AuditService` instance as `args[0]`.
  private auditService: AuditService;

  constructor(...args: unknown[]) {
    this.auditService = args[0] as AuditService;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const token = this.extractToken(context);
    if (!token) {
      this.logRejection(context);
      return false;
    }

    // NitroCloud has no post-creation env var UI for this deployment (only a
    // one-time prompt at app creation, which was skipped before this guard
    // existed) — falling back to the same placeholder already public in
    // .env.example. This guard authenticates *who's calling*; it is not the
    // project's core invariant (see rule 14 — execute_payment's approval
    // token is what actually gates money movement, and has no such fallback).
    const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

    const payload = verifyJWT(token, { secret });
    if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
      this.logRejection(context);
      return false;
    }

    const role = payload.role as unknown;
    if (role !== 'analyst' && role !== 'controller') {
      this.logRejection(context);
      return false;
    }

    const auth: AuthContext = { subject: payload.sub, role };
    context.auth = auth;
    return true;
  }

  private logRejection(context: ExecutionContext): void {
    this.auditService.log({
      tool: context.toolName ?? 'unknown',
      subject: null,
      outcome: 'blocked',
      reason: 'invalid or missing token',
    });
  }

  private extractToken(context: ExecutionContext): string | null {
    // Try _meta.authorization first (STDIO/NitroStudio, confirmed working
    // path against the deployed HTTP/SSE transport).
    const metaAuth = context.metadata?.authorization;
    if (typeof metaAuth === 'string' && metaAuth.startsWith('Bearer ')) {
      return metaAuth.substring(7);
    }

    // Try nested _meta object, in case Studio wraps it one level deeper.
    const nestedAuth = (context.metadata as Record<string, unknown> | undefined)?._meta as
      | Record<string, unknown>
      | undefined;
    const nestedAuthHeader = nestedAuth?.authorization;
    if (typeof nestedAuthHeader === 'string' && nestedAuthHeader.startsWith('Bearer ')) {
      return nestedAuthHeader.substring(7);
    }

    // Try raw request headers (HTTP transport) — not confirmed wired into
    // ExecutionContext in this SDK version, but harmless to check.
    const headerAuth = (context as unknown as { request?: { headers?: Record<string, string> } })
      .request?.headers?.authorization;
    if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
      return headerAuth.substring(7);
    }

    return null;
  }
}
