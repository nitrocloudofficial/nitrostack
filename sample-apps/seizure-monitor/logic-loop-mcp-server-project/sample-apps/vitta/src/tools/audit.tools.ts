/**
 * audit.tools.ts — MCP tools 11 & 12 (log_audit_event / get_audit_trail) + a
 * DPDP consent-revocation helper. Every payload is PII-redacted before storage.
 */
import { ToolDecorator as Tool, ControllerDecorator as Controller, ExecutionContext, z } from '@nitrostack/core';
import { logAuditEvent, getAuditTrail, revokeConsent } from '../lib/engine.js';

@Controller()
export class AuditTools {
  @Tool({
    name: 'log_audit_event',
    description:
      'Append a redacted event to the immutable audit trail (returns an ack + sequence number). Every decision, prompt and parameter version is stamped. PII is redacted automatically.',
    inputSchema: z.object({
      session_id: z.string(),
      actor: z.string().describe('The tool/agent recording the event, e.g. "underwrite".'),
      event: z.string().describe('Event type, e.g. "DECISION", "NOTE".'),
      payload: z.record(z.any()).describe('Arbitrary event payload (will be PII-redacted).'),
    }),
  })
  async log_audit_event(input: any, ctx: ExecutionContext) {
    return logAuditEvent(input);
  }

  @Tool({
    name: 'get_audit_trail',
    description:
      'Retrieve the append-only audit trail for a session. view=FULL (all fields), SUMMARY (seq/actor/event/ts) or COMPLIANCE_VIEW (adds version stamps). PII is already redacted at write time.',
    inputSchema: z.object({
      session_id: z.string(),
      view: z.enum(['FULL', 'SUMMARY', 'COMPLIANCE_VIEW']).optional().describe('Default FULL.'),
    }),
  })
  async get_audit_trail(input: any, ctx: ExecutionContext) {
    return getAuditTrail(input);
  }

  @Tool({
    name: 'revoke_consent',
    description:
      'DPDP withdrawal: revoke a previously issued consent by its token id (jti — returned by record_consent). After revocation, consent-gated tools refuse with CONSENT_REVOKED.',
    inputSchema: z.object({
      session_id: z.string(),
      lead_id: z.string(),
      jti: z.string().describe('The consent token id to revoke (from the consent proof).'),
    }),
  })
  async revoke_consent(input: any, ctx: ExecutionContext) {
    return revokeConsent(input);
  }
}
