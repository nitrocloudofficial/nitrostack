import { Injectable } from '@nitrostack/core';
import { GraphService } from '../graph/graph.service.js';
import { RedactionService } from '../redaction/redaction.service.js';
import { LlmService } from '../llm/llm.service.js';
import { RiskService, Finding, Severity } from './risk.service.js';

export interface Redline {
  findingId: string;
  clauseId: string | null;
  severity: Severity;
  category: string;
  title: string;
  /** The clause as drafted (redacted form). */
  originalText: string;
  /** Proposed replacement language (redacted form). */
  proposedText: string;
  /** Why this edit, in founder-facing terms. */
  reason: string;
  /** What to concede if the counterparty pushes back. */
  negotiationPosition: string;
  /** Clause ids that reference this clause and must stay consistent. */
  dependentClauseIds: string[];
  /** Set when a dependent clause would also need editing. */
  dependencyWarning?: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface CounterProposal {
  graphId: string;
  sessionId: string;
  source: 'llm' | 'heuristic';
  /** True when originals were substituted back for the user. */
  restored: boolean;
  summary: string;
  riskScore: number;
  redlines: Redline[];
  negotiationEmail: { subject: string; body: string };
  /** Present only when restoration was requested but the vault had expired. */
  restorationWarning?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const REDLINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'redlines', 'negotiationEmail'],
  properties: {
    summary: { type: 'string' },
    redlines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['findingId', 'proposedText', 'reason', 'negotiationPosition', 'priority'],
        properties: {
          findingId: { type: 'string' },
          proposedText: { type: 'string' },
          reason: { type: 'string' },
          negotiationPosition: { type: 'string' },
          priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          dependencyWarning: { type: 'string' }
        }
      }
    },
    negotiationEmail: {
      type: 'object',
      additionalProperties: false,
      required: ['subject', 'body'],
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' }
      }
    }
  }
} as const;

const SYNTHESIZER_SYSTEM = `You are the Redline & Counter-Proposal Synthesizer for Phalanx, an AI contract risk analyst. You advise the SMALLER party — a founder or startup counsel negotiating paper drafted by a larger counterparty.

You receive: findings from four specialized agents, the redacted clause text each finding is anchored to, and the clause dependency edges from the contract knowledge graph.

Token discipline (non-negotiable):
- The text is REDACTED. Sensitive values appear as bracketed tokens: [CLIENT_NAME_001], [ACV_VALUE_003], [JURISDICTION_002], [MONEY_014].
- Reproduce every token EXACTLY as it appears — same spelling, same numeric suffix. The tokens are substituted back with real values before the user sees your output, so a mangled token becomes a hole in their document.
- Never guess or invent a value behind a token, and never write around one. If a clause says fees are [ACV_VALUE_003], your redline says [ACV_VALUE_003] too.
- Never introduce a new token that did not appear in the input.

Writing redlines:
- proposedText must be complete, self-contained clause language the user can paste into a document.
- Stay close to the original drafting. A rewrite from scratch reads as hostile.
- Be commercially realistic. Ask for terms a reasonable counterparty will actually accept.
- negotiationPosition is the concession you would accept if pushed.
- reason explains the business rationale for the proposed change.
- Priority should be "High", "Medium", or "Low" based on the business impact of the clause.

Dependency awareness:
- Before proposing an edit, check whether other clauses reference the one you are changing.
- If your edit would break a defined term, set dependencyWarning.

The negotiation email:
- Address it to the counterparty's commercial contact.
- Group asks by priority (High, Medium, Low). Lead with the High priority items and give a one-line business reason for each. Reference the section number (if available) or clause title.
- Keep it professional, warm, direct.`;

@Injectable({ deps: [RiskService, GraphService, RedactionService, LlmService] })
export class RedlineService {
  constructor(
    private riskService: RiskService,
    private graphService: GraphService,
    private redactionService: RedactionService,
    private llm: LlmService
  ) { }

  /**
   * Aggregate agent findings into a counter-proposal.
   *
   * Ordering matters for privacy: the LLM is called with redacted text only, and
   * restoration happens strictly afterwards on the way out to the user.
   */
  async synthesize(
    graphId: string,
    sessionId: string,
    opts: { restore?: boolean; findings?: Finding[] } = {}
  ): Promise<CounterProposal> {
    const analysis = opts.findings
      ? { findings: opts.findings, totalScore: this.scoreOf(opts.findings) }
      : await this.riskService.runAllAgents(graphId);

    const findings = [...analysis.findings].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );

    // --- Redacted phase: everything below runs on placeholder tokens only. ---
    const llmResult = await this.draftWithLlm(graphId, findings);

    let redlines: Redline[];
    let summary: string;
    let email: { subject: string; body: string };
    let source: 'llm' | 'heuristic';

    if (llmResult) {
      const byId = new Map(llmResult.redlines.map((r) => [r.findingId, r]));
      redlines = findings.map((f) => this.assemble(graphId, f, byId.get(f.id)));
      summary = llmResult.summary;
      email = llmResult.negotiationEmail;
      source = 'llm';
    } else {
      redlines = findings.map((f) => this.assemble(graphId, f, undefined));
      summary = this.templateSummary(findings, analysis.totalScore);
      email = this.templateEmail(redlines);
      source = 'heuristic';
    }

    const proposal: CounterProposal = {
      graphId,
      sessionId,
      source,
      restored: false,
      summary,
      riskScore: analysis.totalScore,
      redlines,
      negotiationEmail: email
    };

    // --- Restoration phase: user-facing only, never fed back to a model. ---
    if (opts.restore) {
      return this.restoreProposal(proposal, sessionId);
    }

    return proposal;
  }

  /**
   * Decrypt the session token map and substitute originals into every
   * user-facing string. Called only on the way out to the user.
   */
  restoreProposal(proposal: CounterProposal, sessionId: string): CounterProposal {
    const probe = this.redactionService.restore('', sessionId);
    if (!probe.found) {
      return {
        ...proposal,
        restored: false,
        restorationWarning:
          'The encrypted token map for this session has expired or was destroyed. Output is shown with placeholder tokens intact.'
      };
    }

    const sub = (text?: string) => text ? this.redactionService.restore(text, sessionId).restoredText : '';

    return {
      ...proposal,
      restored: true,
      summary: sub(proposal.summary),
      redlines: (proposal.redlines || []).map((r) => ({
        ...r,
        originalText: sub(r.originalText),
        proposedText: sub(r.proposedText),
        reason: sub(r.reason),
        negotiationPosition: sub(r.negotiationPosition),
        dependencyWarning: r.dependencyWarning ? sub(r.dependencyWarning) : undefined
      })),
      negotiationEmail: {
        subject: sub(proposal.negotiationEmail?.subject),
        body: sub(proposal.negotiationEmail?.body)
      }
    };
  }

  /** Simple unified-diff style view of a single redline, for the UI. */
  diff(originalText: string, proposedText: string): string {
    const before = originalText.split(/(?<=\.)\s+/).filter(Boolean);
    const after = proposedText.split(/(?<=\.)\s+/).filter(Boolean);
    const kept = new Set(before.filter((s) => after.includes(s)));

    const lines = [
      '--- current',
      '+++ proposed',
      ...before.map((s) => (kept.has(s) ? `  ${s}` : `- ${s}`)),
      ...after.filter((s) => !kept.has(s)).map((s) => `+ ${s}`)
    ];
    return lines.join('\n');
  }

  private async draftWithLlm(
    graphId: string,
    findings: Finding[]
  ): Promise<{
    summary: string;
    redlines: Array<{
      findingId: string;
      proposedText: string;
      reason: string;
      negotiationPosition: string;
      priority: 'High' | 'Medium' | 'Low';
      dependencyWarning?: string;
    }>;
    negotiationEmail: { subject: string; body: string };
  } | null> {
    if (!this.llm.available || findings.length === 0) return null;

    const findingBlock = findings
      .map((f) => {
        const deps = f.clauseId ? this.graphService.dependents(graphId, f.clauseId) : [];
        return `<finding id="${f.id}" agent="${f.agent}" severity="${f.severity}" category="${f.category}">
issue: ${f.issue}
business impact: ${f.businessImpact}
legal reason: ${f.legalReason}
agent recommendation: ${f.recommendation}
clause id: ${f.clauseId ?? 'unanchored'}
clauses that reference this one: ${deps.length ? deps.join(', ') : 'none'}
current language:
${f.clause || '(no clause text — this finding is about a MISSING provision; draft the provision from scratch)'}
</finding>`;
      })
      .join('\n\n');

    const user = `Draft redlines and a negotiation email for the findings below.

Produce exactly one redline entry per finding, keyed by its findingId. Order them by severity, most severe first.

${findingBlock}

Return the summary (2–4 sentences a founder can read before a call), one redline per finding, and the negotiation email.`;

    return this.llm.json({
      system: SYNTHESIZER_SYSTEM,
      user,
      schema: REDLINE_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 32000,
      effort: 'high'
    });
  }

  private assemble(
    graphId: string,
    finding: Finding,
    drafted:
      | { findingId?: string; proposedText: string; reason: string; negotiationPosition: string; priority?: 'High' | 'Medium' | 'Low'; dependencyWarning?: string }
      | undefined
  ): Redline {
    const dependents = finding.clauseId
      ? this.graphService.dependents(graphId, finding.clauseId)
      : [];

    // Even without a model, warn when an edit touches a referenced clause —
    // this is graph-derived, not generated.
    const dependencyWarning =
      drafted?.dependencyWarning ??
      (dependents.length > 0
        ? `Clause${dependents.length > 1 ? 's' : ''} ${dependents.join(', ')} reference${dependents.length > 1 ? '' : 's'} this provision. Check that the proposed edit stays consistent with ${dependents.length > 1 ? 'them' : 'it'} before sending.`
        : undefined);

    return {
      findingId: finding.id,
      clauseId: finding.clauseId,
      severity: finding.severity,
      category: finding.category,
      title: finding.clauseTitle || 'Missing Clause',
      originalText: finding.clause,
      proposedText: drafted?.proposedText ?? `[Suggested change] ${finding.recommendation}`,
      reason: drafted?.reason ?? finding.businessImpact,
      negotiationPosition:
        drafted?.negotiationPosition ??
        'No fallback drafted locally — review with counsel before conceding this point.',
      dependentClauseIds: dependents,
      dependencyWarning,
      priority: drafted?.priority ?? (finding.severity === 'Critical' || finding.severity === 'High' ? 'High' : (finding.severity === 'Medium' ? 'Medium' : 'Low'))
    };
  }

  private templateSummary(findings: Finding[], score: number): string {
    const counts = findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {});

    const parts = (['Critical', 'High', 'Medium', 'Low'] as Severity[])
      .filter((s) => counts[s])
      .map((s) => `${counts[s]} ${s.toLowerCase()}`);

    if (parts.length === 0) {
      return 'No material risks were identified in the analyzed clauses. Review coverage before relying on this result — a clean report can also mean the relevant clauses were not present in the document.';
    }

    return `Analysis surfaced ${findings.length} finding${findings.length === 1 ? '' : 's'} (${parts.join(', ')}), with an aggregate risk score of ${score}/100. The must-fix items are ${findings
      .filter((f) => f.severity === 'Critical' || f.severity === 'High')
      .slice(0, 3)
      .map((f) => (f.issue || f.clauseTitle || 'unspecified risk').toLowerCase())
      .join('; ') || 'none'}. Redlines below were drafted locally from the rules engine; review each before sending.`;
  }

  private templateEmail(redlines: Redline[]): { subject: string; body: string } {
    const group = (p: Redline['priority']) => redlines.filter((r) => r.priority === p);
    const bullet = (r: Redline) =>
      `- ${r.category}${r.clauseId ? ` (clause ${r.clauseId})` : ''}: ${r.title || 'Clause update'}. ${(r.reason || 'Recommended revision').split('. ')[0]}.`;

    const mustFix = group('High');
    const shouldFix = group('Medium');
    const niceToHave = group('Low');

    const sections: string[] = [
      'Hi [CLIENT_NAME],',
      '',
      'Thanks for sending the draft over — we have reviewed it and want to move forward. A few points we need to work through before signature:'
    ];

    if (mustFix.length) {
      sections.push('', 'Required before signature:', ...mustFix.map(bullet));
    }
    if (shouldFix.length) {
      sections.push('', 'Important to us:', ...shouldFix.map(bullet));
    }
    if (niceToHave.length) {
      sections.push(
        '',
        'Lower priority — happy to be flexible here:',
        ...niceToHave.map(bullet)
      );
    }

    sections.push(
      '',
      'Proposed language for each point is attached as a marked-up draft. Happy to jump on a call this week if it would be faster to talk any of these through.',
      '',
      'Best regards'
    );

    return {
      subject: 'Contract review — proposed revisions before signature',
      body: sections.join('\n')
    };
  }

  private scoreOf(findings: Finding[]): number {
    const w: Record<Severity, number> = { Critical: 40, High: 25, Medium: 12, Low: 4 };
    return Math.min(100, findings.reduce((sum, f) => sum + w[f.severity], 0));
  }
}
