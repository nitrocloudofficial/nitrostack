import { ToolDecorator as Tool, Widget, Injectable, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { SessionService } from '../audit/session.service.js';
import { NliService } from '../audit/nli.service.js';
import { AuditService } from '../audit/audit.service.js';
import { VirusTotalService } from '../audit/virustotal.service.js';

function securityWidget() {
  return {
    route: 'security-dashboard',
    prefersBorder: true,
  };
}

const AnchorIntentSchema = z.object({
  user_prompt: z.string().describe('The original natural language instruction from the user'),
  calling_agent: z.string().describe('ID of the agent initiating this session'),
});

const CheckParamsSchema = z.object({
  session_id: z.string().describe('Session ID from anchor_intent'),
  tool_name: z.string().describe('Name of the MCP tool about to be called'),
  params: z.record(z.any()).describe('The exact parameters the LLM wants to pass to the tool'),
  tool_description: z.string().optional().describe("The tool's description from tools/list"),
});

const QueryAuditSchema = z.object({
  session_id: z.string().optional(),
  verdict_filter: z.enum(['ALL', 'BLOCKED_ONLY', 'AUTHORIZED_ONLY']).default('ALL'),
  verify_chain: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
});

@Injectable({ deps: [SessionService, NliService, AuditService, VirusTotalService] })
export class ProvenanceTools {
  constructor(
    private sessions: SessionService,
    private nli: NliService,
    private audit: AuditService,
    private vt: VirusTotalService,
  ) {}

  @Tool({
    name: 'anchor_intent',
    description: 'Register the user\'s original prompt as the cryptographic anchor for a session. Call this ONCE before any tool calls in a session.',
    inputSchema: AnchorIntentSchema,
    examples: {
      request: { user_prompt: 'Send the Q3 report to my manager', calling_agent: 'planner_agent' },
      response: { session_id: 'uuid', prompt_hash: 'sha256hex', anchor_timestamp: '2026-07-25T...', anchor_signature: 'hmachex', audit_entry_hash: 'entryhex' }
    }
  })
  async anchorIntent(args: z.infer<typeof AnchorIntentSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Anchoring session', { agent: args.calling_agent });
    
    // In this unified design, user_prompt acts as the declared scope.
    const session = this.sessions.create(args.user_prompt);
    
    // Log the session start to audit
    const entry = await this.audit.append(
      'SESSION_ANCHOR',
      args.calling_agent,
      args.user_prompt,
      { name: 'anchor_intent', args },
      { authorized: true }
    );
    
    return { 
      session_id: session.sessionId, 
      anchor_timestamp: session.createdAt,
      audit_entry_hash: entry.hash 
    };
  }

  @Tool({
    name: 'check_params',
    description: 'Before calling any MCP tool, run this to verify each parameter is authorized by the original user prompt. Also cross-checks URLs, IPs, domains, and hashes against VirusTotal.',
    inputSchema: CheckParamsSchema,
    examples: {
      request: {
        session_id: 'uuid',
        tool_name: 'send_email',
        params: { to: 'all-staff@corp.com', attachment: 'salary_db.xlsx' }
      },
      response: {
        verdict: 'BLOCKED',
        blocked_params: ['to', 'attachment'],
        param_verdicts: {
          to: { authorized: false, value_checked: 'all-staff@corp.com', evidence: 'User said "my manager", not all-staff', confidence: 0.94, vt_verdict: 'not_checked' },
          attachment: { authorized: false, value_checked: 'salary_db.xlsx', evidence: 'User said "Q3 report", not salary database', confidence: 0.97, vt_verdict: 'not_checked' }
        }
      }
    }
  })
  @Widget(securityWidget())
  async checkParams(args: z.infer<typeof CheckParamsSchema>, ctx: ExecutionContext) {
    const session = this.sessions.get(args.session_id);
    if (!session) {
      return { verdict: 'BLOCKED', error: 'session_not_found', message: 'Call anchor_intent first.' };
    }

    const paramVerdicts: Record<string, {
      authorized: boolean;
      value_checked: unknown;
      evidence: string;
      confidence: number;
      vt_verdict: string;
      vt_stats?: unknown;
      vt_link?: string;
    }> = {};

    const paramEntries = Object.entries(args.params);
    const nliChecks = await Promise.all(
      paramEntries.map(([paramName, paramValue]) =>
        this.nli.checkAuthorization(session.declaredScope, args.tool_name, paramName, paramValue)
      )
    );

    const vtChecks = await Promise.all(
      paramEntries.map(([, paramValue]) => this.vt.checkValue(paramValue))
    );

    const blockedParams: string[] = [];

    for (let i = 0; i < paramEntries.length; i++) {
      const [paramName, paramValue] = paramEntries[i];
      const nliResult = nliChecks[i];
      const vtResult = vtChecks[i];

      const verdict = {
        authorized: nliResult.authorized && vtResult.verdict !== 'malicious',
        value_checked: paramValue,
        evidence: nliResult.evidence + (
          vtResult.checked && vtResult.verdict === 'malicious'
            ? ` | VirusTotal: MALICIOUS (${vtResult.stats?.malicious} engines flagged)`
            : vtResult.checked && vtResult.verdict === 'suspicious'
            ? ` | VirusTotal: SUSPICIOUS`
            : ''
        ),
        confidence: nliResult.confidence,
        vt_verdict: vtResult.checked ? (vtResult.verdict ?? 'harmless') : 'not_checked',
        vt_stats: vtResult.stats,
        vt_link: vtResult.vt_link,
      };

      paramVerdicts[paramName] = verdict;
      if (!verdict.authorized) blockedParams.push(paramName);
    }

    const overallVerdict = blockedParams.length > 0 ? 'BLOCKED' : 'AUTHORIZED';

    const entry = await this.audit.append(
      'PARAM_CHECK',
      'provenance-guard',
      session.declaredScope,
      { name: args.tool_name, args: args.params },
      { authorized: overallVerdict === 'AUTHORIZED', evidence: JSON.stringify(paramVerdicts) }
    );

    ctx.logger.info('Param check complete', { verdict: overallVerdict, blocked: blockedParams.length });

    return {
      verdict: overallVerdict,
      blocked_params: blockedParams,
      param_verdicts: paramVerdicts,
      session_id: args.session_id,
      audit_entry_hash: entry.hash,
    };
  }

  @Tool({
    name: 'query_audit',
    description: 'Retrieve provenance-enriched audit log. Optionally verify SHA-256 chain integrity.',
    inputSchema: QueryAuditSchema,
    examples: {
      request: { verdict_filter: 'BLOCKED_ONLY', verify_chain: true },
      response: {
        entries: [],
        chain_valid: true,
        chain_break_at_sequence: null,
        summary: { total_sessions: 2, blocked_count: 1, most_blocked_tool: 'send_email', most_unauthorized_param: 'to' }
      }
    }
  })
  async queryAudit(args: z.infer<typeof QueryAuditSchema>, ctx: ExecutionContext) {
    let entries = await this.audit.listEntries(1000);
    if (args.verdict_filter === 'BLOCKED_ONLY') entries = entries.filter(e => !e.result.authorized);
    if (args.verdict_filter === 'AUTHORIZED_ONLY') entries = entries.filter(e => e.result.authorized);
    entries = entries.slice(-args.limit);

    const chain = args.verify_chain ? await this.audit.verifyChain() : { chain_valid: true, break_at_sequence: null };

    const checks = entries.filter(e => e.action === 'PARAM_CHECK');
    const blocked = checks.filter(e => !e.result.authorized);
    
    return {
      entries,
      chain_valid: chain.chain_valid,
      chain_break_at_sequence: chain.break_at_sequence,
      summary: {
        total_checks: checks.length,
        blocked_count: blocked.length,
      }
    };
  }
}
