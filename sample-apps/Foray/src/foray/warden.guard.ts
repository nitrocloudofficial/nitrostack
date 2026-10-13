/**
 * FORAY — THE WARDEN.  R-03.  Demo beat 6.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  This is the closing argument of the pitch. Read before editing.
 *
 *  "The agents are separate because their permissions are separate.
 *   The boundary is enforced at the MCP layer, not in a policy document.
 *   Let me try to break it in front of you."
 *
 *  A faculty caller invoking get_reflection does not receive redacted
 *  text, or an empty string, or a polite refusal from a model. The call
 *  is refused before the handler runs, and a row is written to the
 *  AccessLog. On stage the judge watches that row appear.
 * ══════════════════════════════════════════════════════════════════════
 *
 * Runs as a NitroStack Guard, so it executes BEFORE the tool handler and
 * cannot be talked around by prompt injection — a model cannot reach a
 * handler the framework never dispatched to.
 */

import { Guard, ExecutionContext, Injectable } from '@nitrostack/core';
import { TOOL_SCOPES, denialReason, isAllowed } from './permissions.js';
import { writeAccessLog } from './api.client.js';

/**
 * Resolve the calling role, most trustworthy source first.
 *
 * FORAY_ROLE is what makes the demo work: launch one NitroStudio
 * connection as `faculty` and another as `diagnostician`, and the same
 * tool call succeeds in one and is refused in the other.
 */
export function resolveRole(context: ExecutionContext): string {
  const ctx = context as unknown as {
    auth?: { role?: string };
    clientMetadata?: { roles?: string[]; role?: string };
    metadata?: Record<string, unknown>;
  };
  return (
    ctx.auth?.role ??
    ctx.clientMetadata?.role ??
    ctx.clientMetadata?.roles?.[0] ??
    (ctx.metadata?.['role'] as string | undefined) ??
    process.env.FORAY_ROLE ??
    '__anonymous__'
  );
}

@Injectable()
export class WardenGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const toolName = (context as unknown as { toolName?: string }).toolName ?? 'unknown';
    const role = resolveRole(context);
    const scope = TOOL_SCOPES[toolName];

    // An unmapped tool is DENIED. Fail closed, always.
    // Adding a tool without adding it to TOOL_SCOPES should break loudly
    // in development, not silently leak in front of judges.
    if (!scope) {
      const { rule, reqId } = denialReason(role, 'unmapped');
      context.logger.error('WARDEN DENY — tool not in permission matrix', {
        toolName,
        role,
      });
      await writeAccessLog({
        actor_role: role,
        attempted: `${toolName}:unmapped`,
        decision: 'DENIED',
        rule: `P-99: tool '${toolName}' is not declared in the permission matrix`,
        req_id: reqId,
        ts: new Date().toISOString(),
      });
      throw new WardenDenied(
        `Tool '${toolName}' is not declared in the permission matrix. Denied by default.`,
        rule,
        reqId,
        role,
      );
    }

    if (isAllowed(role, scope)) {
      context.logger.info('warden allow', { toolName, role, scope });
      return true;
    }

    // ── THE DENIAL. This is the beat. ──
    const { rule, reqId } = denialReason(role, scope);
    const attempted = `${toolName}:${scope}`;

    context.logger.error('WARDEN DENY', { toolName, role, scope, rule, reqId });

    await writeAccessLog({
      actor_role: role,
      attempted,
      decision: 'DENIED',
      rule,
      req_id: reqId,
      ts: new Date().toISOString(),
    });

    throw new WardenDenied(
      `DENIED. Role '${role}' cannot access scope '${scope}'.`,
      rule,
      reqId,
      role,
    );
  }
}

/**
 * Thrown on denial. Carries the rule and requirement id so the UI can
 * render them verbatim — the judge should see the exact rule that fired,
 * not a generic 403.
 */
export class WardenDenied extends Error {
  readonly decision = 'DENIED' as const;
  constructor(
    message: string,
    readonly rule: string,
    readonly reqId: string,
    readonly actorRole: string,
  ) {
    super(message);
    this.name = 'WardenDenied';
  }
}
