/**
 * Tool-level half of the authorisation boundary.
 *
 * The Express middleware in `HttpHardeningService` covers the remote surface,
 * but stdio never touches Express — a client spawning this server as a
 * subprocess would otherwise reach `resolve_conflict` unauthenticated. This
 * guard closes that path by reading the credential out of the MCP request's
 * `_meta`, which NitroStack surfaces as `context.metadata`.
 *
 * The two enforcement points compose rather than conflict: on the HTTP path the
 * middleware authenticates the header and then copies the credential into
 * `_meta`, so by the time the guard runs the same principal is presented again
 * and simply verifies a second time. One list of protected tools, one
 * AuthService, two entrances.
 */
import { Injectable, ExecutionContext } from '@nitrostack/core';
import type { Guard } from '@nitrostack/core';
import { AuthService, AuthError } from '../services/auth.service.js';
import { isProtectedTool } from './protected-tools.js';

/**
 * NitroStack resolves guards through the DI container when they are registered
 * there, which is what lets this one receive the shared AuthService instead of
 * constructing its own copy of the credential config.
 */
@Injectable({ deps: [AuthService] })
export class AdminGuard implements Guard {
  private readonly auth: AuthService;

  /**
   * Typed as `unknown[]` to satisfy NitroStack's `GuardConstructor`
   * (`new (...args: unknown[]) => Guard`), which `@UseGuards` demands and which
   * a narrowly-typed constructor cannot structurally match. DI supplies the
   * AuthService declared in `deps` as the first argument; the fallback covers a
   * guard someone constructs directly, where reading the same environment
   * yields the same configuration anyway.
   */
  constructor(...args: unknown[]) {
    this.auth = (args[0] as AuthService | undefined) ?? new AuthService();
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.auth.enabled) return true;
    if (!isProtectedTool(context.toolName)) return true;

    const metadata = (context.metadata ?? {}) as Record<string, unknown>;
    const principal = this.auth.authenticate({
      apiKey: AdminGuard.stringOrUndefined(metadata.apiKey ?? metadata.api_key),
      authorization: AdminGuard.stringOrUndefined(
        metadata.authorization ?? metadata.token ?? metadata.bearer
      ),
    });

    // Recorded rather than returned: `resolve_conflict` writes `resolvedBy` into
    // the manifest, and an operator auditing that ruling needs to be able to tie
    // it back to a credential.
    context.logger.info('Authorised privileged tool call', {
      tool: context.toolName,
      subject: principal.subject,
      method: principal.method,
    });
    return true;
  }

  private static stringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}

export { AuthError };
