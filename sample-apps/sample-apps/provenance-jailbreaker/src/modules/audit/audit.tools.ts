import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { AuditService }      from './audit.service.js';
import { ScopeGuardService } from './scope-guard.service.js';
import { SessionService }    from './session.service.js';

/**
 * AuditTools — MCP-exposed tools for the Provenance-Guarded Red-Team Harness.
 *
 * Tools:
 *   verify_audit_chain  — walk the hash chain and report tamper status
 *   log_audit_entry     — append a new entry to the audit chain
 *   check_scope         — NLI scope authorization check for an attacker tool call
 *   create_session      — create a new red-team session with a declared scope
 *   get_session         — retrieve a session by its sessionId
 */
@Injectable({ deps: [AuditService, ScopeGuardService, SessionService] })
export class AuditTools {
  constructor(
    private audit: AuditService,
    private scopeGuard: ScopeGuardService,
    private session: SessionService
  ) {}

  // ─── verify_audit_chain ───────────────────────────────────────────────────

  @Tool({
    name: 'verify_audit_chain',
    description:
      'Verify the integrity of the entire tamper-evident audit chain. ' +
      'Returns chain_valid: true if no tampering is detected, or ' +
      'chain_valid: false with break_at_sequence indicating the first ' +
      'corrupted entry.',
    inputSchema: z.object({})
  })
  async verifyAuditChain(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Verifying audit chain integrity');
    const result = await this.audit.verifyChain();
    ctx.logger.info('Chain verification complete', { chain_valid: result.chain_valid });
    return result;
  }

  // ─── log_audit_entry ─────────────────────────────────────────────────────

  @Tool({
    name: 'log_audit_entry',
    description:
      'Append a new entry to the tamper-evident audit chain. ' +
      'Used by the attacker orchestrator to record every tool call ' +
      '(authorized or blocked) with its scope-check result.',
    inputSchema: z.object({
      action: z.string().describe('Short label for what happened, e.g. "test_target_model_v1"'),
      actor: z.string().describe('Who initiated the action, e.g. "attacker-agent"'),
      scope: z.string().describe('The declared red-team scope active at the time'),
      toolCallName: z.string().describe('Name of the MCP tool that was called'),
      toolCallArgs: z
        .record(z.unknown())
        .describe('Arguments passed to the tool call')
        .default({}),
      authorized: z.boolean().describe('Whether the scope guard authorized the call'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Scope-guard confidence score (0–1)'),
      evidence: z.string().optional().describe('Scope-guard evidence string')
    })
  })
  async logAuditEntry(input: {
    action: string;
    actor: string;
    scope: string;
    toolCallName: string;
    toolCallArgs: Record<string, unknown>;
    authorized: boolean;
    confidence?: number;
    evidence?: string;
  }, ctx: ExecutionContext) {
    ctx.logger.info('Appending audit entry', { action: input.action, actor: input.actor });

    const entry = await this.audit.append(
      input.action,
      input.actor,
      input.scope,
      { name: input.toolCallName, args: input.toolCallArgs },
      {
        authorized: input.authorized,
        confidence: input.confidence,
        evidence: input.evidence
      }
    );

    return {
      sequence: entry.sequence,
      hash: entry.hash,
      timestamp: entry.timestamp,
      message: `Entry #${entry.sequence} appended to audit chain.`
    };
  }

  // ─── check_scope ─────────────────────────────────────────────────────────

  @Tool({
    name: 'check_scope',
    description:
      'NLI-style scope authorization check. Determines whether an attacker ' +
      "agent's proposed tool call is authorized by the declared red-team scope. " +
      'Returns { authorized, confidence, evidence }.',
    inputSchema: z.object({
      declaredScope: z
        .string()
        .describe(
          'The red-team scope string declared at session start, ' +
            'e.g. "Test target-model-v1 for harmful-instruction-compliance only."'
        ),
      toolCallName: z.string().describe('Name of the tool the attacker wants to call'),
      toolCallArgs: z
        .record(z.unknown())
        .describe('Arguments the attacker intends to pass')
        .default({})
    })
  })
  async checkScope(
    input: {
      declaredScope: string;
      toolCallName: string;
      toolCallArgs: Record<string, unknown>;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Scope check requested', {
      tool: input.toolCallName,
      scope: input.declaredScope.slice(0, 80)
    });

    const result = await this.scopeGuard.check(input.declaredScope, {
      name: input.toolCallName,
      args: input.toolCallArgs
    });

    ctx.logger.info('Scope check result', { authorized: result.authorized });
    return result;
  }

  // ─── create_session ───────────────────────────────────────────────────────

  @Tool({
    name: 'create_session',
    description:
      'Create a new red-team session with a declared scope. ' +
      'The declared scope is locked for the duration of the session and ' +
      'used by the scope guard for every subsequent tool call. ' +
      'Returns the session object including the generated sessionId.',
    inputSchema: z.object({
      declaredScope: z
        .string()
        .describe(
          'The red-team scope to lock for this session, ' +
            'e.g. "Test target-model-v1 for harmful-instruction-compliance only."'
        )
    })
  })
  async createSession(input: { declaredScope: string }, ctx: ExecutionContext) {
    ctx.logger.info('Creating new session', { scope: input.declaredScope.slice(0, 80) });
    const sess = this.session.create(input.declaredScope);
    ctx.logger.info('Session created', { sessionId: sess.sessionId });
    return sess;
  }

  // ─── get_session ──────────────────────────────────────────────────────────

  @Tool({
    name: 'get_session',
    description:
      'Retrieve a red-team session by its sessionId. ' +
      'Returns the session object (sessionId, declaredScope, createdAt, updatedAt) ' +
      'or null if the session does not exist.',
    inputSchema: z.object({
      sessionId: z.string().describe('The UUID of the session to retrieve')
    })
  })
  async getSession(input: { sessionId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching session', { sessionId: input.sessionId });
    const sess = this.session.get(input.sessionId);
    if (!sess) {
      return { found: false, session: null };
    }
    return { found: true, session: sess };
  }

  // ─── list_audit_entries ───────────────────────────────────────────────────

  @Tool({
    name: 'list_audit_entries',
    description:
      'List the most recent audit chain entries in sequence order. ' +
      'Useful for previewing the chain before running verify_audit_chain.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(20)
        .describe('Maximum number of entries to return (default 20, max 200)')
    })
  })
  async listAuditEntries(input: { limit: number }, ctx: ExecutionContext) {
    ctx.logger.info('Listing audit entries', { limit: input.limit });
    const entries = await this.audit.listEntries(input.limit);
    return {
      total: entries.length,
      entries
    };
  }
}
