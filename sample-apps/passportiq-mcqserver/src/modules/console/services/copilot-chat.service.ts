/**
 * CopilotChatService — "Ask PassportIQ", the conversational surface over the
 * whole tool layer.
 *
 * An officer types plain language ("what should I review first?", "investigate
 * PIQ-2026-2004", "approve 2003 note documents verified") and the copilot
 * ANSWERS BY ACTING: it routes the request to the real MCP tools through
 * ToolExecutorService, waits, and narrates what came back — with every tool
 * call listed on the reply for audit.
 *
 * ROUTING IS DETERMINISTIC; ONLY THE PROSE IS OPTIONAL-LLM
 * --------------------------------------------------------
 * Same split as the rest of the codebase: WHAT HAPPENS must be reproducible on
 * conference wifi, so intents are explicit pattern matches, not a model
 * choosing tools. With an LLM key configured the model does one thing only:
 * rewrite the already-computed factual answer into tighter prose (and the turn
 * is labelled `mode: 'llm'`). No key → the deterministic text ships as-is and
 * every capability still works.
 *
 * THE HUMAN GATE APPLIES TO CHAT TOO
 * ----------------------------------
 * "approve X" goes through the SAME officer_decide behind the SAME
 * PipelineCompleteGuard. A premature decision gets the guard's refusal
 * verbatim — chat cannot talk its way past a gate an LLM client could not.
 *
 * Sessions are in-memory and capped, like every other piece of state in this
 * seeded demo.
 */
import { Injectable } from '@nitrostack/core';
import { AgentMemoryService } from '../../agent/services/agent-memory.service.js';
import { CaseflowService } from '../../caseflow/services/caseflow.service.js';
import { ToolExecutorService } from '../../pipeline/services/tool-executor.service.js';
import { LlmService } from '../../verification/services/llm.service.js';
import { AutopilotService } from './autopilot.service.js';
import { ConsoleStateService, type ConsoleQueueRow } from './console-state.service.js';

export interface ChatAction {
  tool: string;
  ok: boolean;
  summary: string;
}

export interface ChatTurn {
  id: string;
  role: 'officer' | 'copilot';
  text: string;
  at: string;
  officer?: string;
  actions?: ChatAction[];
  suggestions?: string[];
  applicationId?: string;
  mode?: 'llm' | 'deterministic';
}

export interface ChatReply {
  sessionId: string;
  turn: ChatTurn;
  latestTurnId: string;
}

const MAX_TURNS_PER_SESSION = 200;
const MAX_SESSIONS = 500;

const APP_ID_RE = /\bPIQ-\d{4}-\d{4}\b/i;
const SHORT_ID_RE = /\b(\d{4})\b/;
const ARN_RE = /\bARN-[A-Z0-9-]+\b/i;

const HELP_TEXT = [
  'I drive the same MCP tools the console buttons do. Try:',
  '• "what should I review first" — the prioritised queue',
  '• "investigate PIQ-2026-2004" — run the autonomous agent on a case',
  '• "why is PIQ-2026-2001 flagged" — the risk story with cited rules',
  '• "run the pipeline on PIQ-2026-1002" — all verification stages',
  '• "show fraud rings" — linked clusters across the queue',
  '• "triage the queue" · "autopilot status" · "run a sweep now"',
  '• "approve PIQ-2026-2003 note documents verified in person" — decisions stay yours; I only file them, and the completeness guard still applies.',
].join('\n');

@Injectable({
  deps: [
    ConsoleStateService,
    ToolExecutorService,
    AgentMemoryService,
    AutopilotService,
    CaseflowService,
    LlmService,
  ],
})
export class CopilotChatService {
  private readonly sessions = new Map<string, ChatTurn[]>();
  private turnCounter = 0;

  constructor(
    private readonly state: ConsoleStateService,
    private readonly executor: ToolExecutorService,
    private readonly agentMemory: AgentMemoryService,
    private readonly autopilot: AutopilotService,
    private readonly caseflow: CaseflowService,
    private readonly llm: LlmService
  ) {}

  getHistory(sessionId: string): ChatTurn[] {
    return this.sessions.get(sessionId) ?? [];
  }

  /** One officer message in, one copilot turn out, side effects listed. */
  async handle(sessionId: string, rawMessage: string, officerName?: string): Promise<ChatReply> {
    const message = String(rawMessage ?? '')
      .trim()
      .slice(0, 2000);
    const officer = (officerName ?? 'Officer on duty').trim().slice(0, 80) || 'Officer on duty';

    this.record(sessionId, {
      id: this.nextId(),
      role: 'officer',
      text: message,
      at: new Date().toISOString(),
      officer,
    });

    const actions: ChatAction[] = [];
    let text: string;
    let suggestions: string[] = [];
    let applicationId: string | undefined;

    try {
      const routed = await this.route(message, officer, actions);
      text = routed.text;
      suggestions = routed.suggestions ?? [];
      applicationId = routed.applicationId;
    } catch (error) {
      // A tool refusal (e.g. the decision guard) is an ANSWER, not a failure —
      // the officer reads the same message an MCP client would.
      text = `That did not go through: ${error instanceof Error ? error.message : String(error)}`;
      suggestions = ['what should I review first', 'help'];
    }

    let mode: 'llm' | 'deterministic' = 'deterministic';
    try {
      const polished = await this.polish(message, text, actions);
      if (polished) {
        text = polished;
        mode = 'llm';
      }
    } catch {
      /* deterministic text ships unchanged */
    }

    const turn: ChatTurn = {
      id: this.nextId(),
      role: 'copilot',
      text,
      at: new Date().toISOString(),
      actions,
      suggestions,
      mode,
      ...(applicationId ? { applicationId } : {}),
    };
    this.record(sessionId, turn);

    return { sessionId, turn, latestTurnId: turn.id };
  }

  // ---------------------------------------------------------------------------
  // Intent routing — explicit, ordered, reproducible
  // ---------------------------------------------------------------------------

  private async route(
    message: string,
    officer: string,
    actions: ChatAction[]
  ): Promise<{ text: string; suggestions?: string[]; applicationId?: string }> {
    const lower = message.toLowerCase();
    const appId = this.resolveApplicationId(message);

    if (!message || /^(help|\?|what can you do|capabilities)/.test(lower)) {
      return { text: HELP_TEXT, suggestions: ['what should I review first', 'show fraud rings'] };
    }

    if (/^(hi|hello|hey|good (morning|afternoon|evening)|namaste)\b/.test(lower)) {
      const overview = this.state.getOverview();
      return {
        text:
          `Hello ${officer}. The queue holds ${overview.totals.pending} pending application(s), ` +
          `${overview.totals.highRisk} high-risk, ${overview.totals.rings} linked cluster(s). ` +
          `Ask me to triage, investigate a case, or explain a risk score.`,
        suggestions: ['what should I review first', 'show fraud rings', 'autopilot status'],
      };
    }

    // ---- decisions: the one write that stays ceremonial ----------------------
    const decision = this.parseDecision(lower);
    if (decision) {
      if (!appId) {
        return {
          text: 'Name the application — e.g. "approve PIQ-2026-2003 note documents verified in person".',
        };
      }
      // officer_decide resolves the officer from ctx.auth; the chat officer is
      // recorded in the note so the audit row still names the human who typed it.
      const note = `${this.parseNote(message) ?? 'Recorded via copilot chat.'} [via copilot chat, officer: ${officer}]`;
      const result = (await this.call(actions, 'officer_decide', {
        applicationId: appId,
        decision,
        note,
      })) as { decision?: string };
      return {
        text:
          `Decision recorded: ${(result.decision ?? decision).toUpperCase()} on ${appId}. ` +
          `It is on the audit trail with your note.`,
        applicationId: appId,
        suggestions: ['show the audit trail', 'what should I review first'],
      };
    }

    // ---- agent runs -----------------------------------------------------------
    if (/investigat|run (the )?agent|deep.?dive|look into/.test(lower) && appId) {
      const run = (await this.call(actions, 'agent_investigate', {
        applicationId: appId,
        ...(/fraud/.test(lower) ? { goal: 'investigate_fraud_signal' } : {}),
      })) as {
        steps?: unknown[];
        stopReason?: string;
        riskScore?: number | null;
        handoff?: { recommendation?: string; rationale?: string; requiresSeniorReview?: boolean } | null;
      };
      const rec = run.handoff?.recommendation ?? 'none yet';
      return {
        text:
          `Investigation of ${appId} finished in ${run.steps?.length ?? '?'} step(s) ` +
          `(${run.stopReason ?? 'completed'}). Risk score: ${run.riskScore ?? 'unscored'}. ` +
          `Agent recommendation: ${rec.toUpperCase()}` +
          `${run.handoff?.requiresSeniorReview ? ' — senior review advised' : ''}. ` +
          `${run.handoff?.rationale ?? ''} The decision remains with you.`,
        applicationId: appId,
        suggestions: [
          `why is ${appId} flagged`,
          `approve ${appId} note reviewed the agent trace`,
          'what should I review first',
        ],
      };
    }

    if (/triage|rank (the )?queue|sweep the queue/.test(lower)) {
      const result = (await this.call(actions, 'agent_triage_queue', {
        maxApplications: 6,
      })) as { processed?: number; escalated?: string[]; detectedRings?: unknown[] };
      return {
        text:
          `Triage complete: ${result.processed ?? 0} application(s) investigated, ` +
          `${result.escalated?.length ?? 0} escalated for senior review, ` +
          `${result.detectedRings?.length ?? 0} coordinated ring(s) surfaced. ` +
          `The officer queue is now ordered by genuine urgency.`,
        suggestions: ['what should I review first', 'show fraud rings'],
      };
    }

    // ---- pipeline ----------------------------------------------------------------
    if (/pipeline|verify|run (all|the) (stages|checks)/.test(lower) && appId) {
      await this.call(actions, 'run_verification_pipeline', { applicationId: appId });
      const view = this.state.getApplicationView(appId);
      return {
        text:
          `Pipeline run on ${appId}: ${view.progress.completed.length}/${view.progress.stages.length} ` +
          `stages complete, risk ${view.risk.score ?? 'unscored'} (${view.risk.band}). ` +
          (view.progress.pipelineComplete
            ? 'The decision gate is open — the case is ready for your call.'
            : `Still missing: ${view.progress.missing.join(', ')}.`),
        applicationId: appId,
        suggestions: [`why is ${appId} flagged`, `investigate ${appId}`],
      };
    }

    // ---- explanations --------------------------------------------------------------
    if (/(why|explain|risk|flag|story|reason)/.test(lower) && appId) {
      return this.explainApplication(appId);
    }

    // ---- queue ------------------------------------------------------------------------
    if (/(queue|review first|priorit|pending|workload|start with|next case)/.test(lower)) {
      const overview = this.state.getOverview();
      const rows = overview.queue.filter((row) => !row.decision).slice(0, 5);
      if (rows.length === 0) {
        return { text: 'The queue is clear — every application has a recorded decision.' };
      }
      const lines = rows.map((row, i) => `${i + 1}. ${this.queueLine(row)}`);
      const first = rows[0];
      return {
        text: `Worst first, here is your queue (${overview.totals.pending} pending):\n${lines.join('\n')}`,
        ...(first ? { applicationId: first.applicationId } : {}),
        suggestions: first
          ? [`why is ${first.applicationId} flagged`, `investigate ${first.applicationId}`]
          : [],
      };
    }

    // ---- graph / rings -------------------------------------------------------------------
    if (/(ring|cluster|graph|linked|network|fraud pattern)/.test(lower)) {
      const overview = this.state.getOverview();
      if (overview.rings.length === 0) {
        return { text: 'No multi-application clusters right now — nothing shares an identifier.' };
      }
      const lines = overview.rings
        .slice(0, 4)
        .map(
          (ring) =>
            `• ${ring.applicationIds.join(' ↔ ')} — ${ring.size} applications sharing ` +
            `${ring.sharedSignalKinds.join(', ')}. ${ring.headline}`
        );
      const firstRing = overview.rings[0]?.applicationIds[0];
      return {
        text:
          `${overview.rings.length} linked cluster(s) in the pool — the pattern no single file shows:\n` +
          lines.join('\n'),
        suggestions: firstRing ? [`investigate ${firstRing}`] : [],
      };
    }

    // ---- autopilot ---------------------------------------------------------------------
    if (/autopilot|sweep/.test(lower)) {
      if (/run|start a sweep|sweep now|kick/.test(lower)) {
        const summary = (await this.autopilot.sweep()) as { investigated?: unknown } | null;
        const count = Array.isArray(summary?.investigated)
          ? summary.investigated.length
          : typeof summary?.investigated === 'number'
            ? summary.investigated
            : 0;
        actions.push({
          tool: 'autopilot.sweep',
          ok: summary !== null,
          summary: summary ? `investigated ${count} application(s)` : 'sweep skipped',
        });
        return {
          text: summary
            ? `Sweep done: ${count} application(s) investigated autonomously. ` +
              `Anything decision-ready is waiting in your queue.`
            : 'Sweep skipped — one is already in flight or nothing is pending.',
          suggestions: ['what should I review first'],
        };
      }
      const status = this.autopilot.getStatus() as unknown as Record<string, unknown>;
      return {
        text:
          `Autopilot is ${String(status['mode'] ?? 'unknown')}. ` +
          `${String(status['sweepsCompleted'] ?? 0)} sweep(s) so far, ` +
          `${String(status['applicationsInvestigated'] ?? 0)} autonomous investigation(s). ` +
          `It investigates and recommends; it never decides.`,
        suggestions: ['run a sweep now', 'what should I review first'],
      };
    }

    // ---- audit ------------------------------------------------------------------------
    if (/audit|decisions? (so far|log|trail)|who decided/.test(lower)) {
      const trail = this.state.getAuditTrail();
      if (trail.total === 0) {
        return { text: 'The audit trail is empty — no decisions recorded yet this session.' };
      }
      const lines = trail.entries
        .slice(0, 5)
        .map(
          (entry) =>
            `• ${entry.decision.toUpperCase()} ${entry.applicationId} by ${entry.officer} — "${entry.note}"`
        );
      return { text: `${trail.total} decision(s) on the trail. Latest:\n${lines.join('\n')}` };
    }

    // ---- caseflow: track an ARN -----------------------------------------------------------
    const arn = ARN_RE.exec(message)?.[0]?.toUpperCase();
    if (arn) {
      const kase = this.caseflow.get(arn);
      const sla = this.caseflow.sla(kase);
      return {
        text:
          `${arn} (${kase.applicantName}, ${kase.applicationType}${kase.tatkal ? ', Tatkal' : ''}) ` +
          `is at stage "${kase.stage}". SLA: ${sla.breached ? 'BREACHED' : 'on track'}` +
          `${kase.officerDecision ? ` — officer decision: ${kase.officerDecision}` : ''}.`,
      };
    }

    // ---- bare application id → snapshot ------------------------------------------------------
    if (appId) {
      return this.explainApplication(appId);
    }

    return {
      text: `I did not catch an actionable instruction in that. ${HELP_TEXT}`,
      suggestions: ['what should I review first', 'show fraud rings', 'autopilot status'],
    };
  }

  // ---------------------------------------------------------------------------
  // Answer assembly
  // ---------------------------------------------------------------------------

  private explainApplication(appId: string): {
    text: string;
    suggestions?: string[];
    applicationId: string;
  } {
    const view = this.state.getApplicationView(appId);
    const summary = view.summary as { applicantName?: string; applicationType?: string };
    const rules = view.rules as {
      violations?: Array<{ ruleName?: string; ruleId?: string; citation?: string }>;
    } | null;
    const violations = rules?.violations ?? [];
    const signals = view.duplicateSignals as {
      signals?: Array<{ kind?: string; matchedApplicationIds?: string[] }>;
    } | null;
    const latestRun = this.agentMemory.getLatestRunFor(appId);

    const parts: string[] = [
      `${appId} — ${summary.applicantName ?? 'unknown applicant'} (${summary.applicationType ?? 'application'}). ` +
        `Risk ${view.risk.score ?? 'unscored'} (${view.risk.band}), pipeline ` +
        `${view.progress.completed.length}/${view.progress.stages.length} stages` +
        `${
          view.progress.pipelineComplete
            ? ' — decision gate OPEN'
            : ` — missing ${view.progress.missing.join(', ') || 'nothing'}`
        }.`,
    ];

    if (violations.length > 0) {
      parts.push(
        `Cited findings: ${violations
          .slice(0, 4)
          .map((v) => `${v.ruleName ?? v.ruleId}${v.citation ? ` [${v.citation}]` : ''}`)
          .join('; ')}.`
      );
    }
    const sigList = signals?.signals ?? [];
    if (sigList.length > 0) {
      parts.push(
        `Shared identifiers: ${sigList
          .slice(0, 4)
          .map((s) => `${s.kind} with ${s.matchedApplicationIds?.join(', ') ?? 'others'}`)
          .join('; ')}.`
      );
    }
    if (latestRun?.handoff) {
      parts.push(
        `Agent recommendation: ${latestRun.handoff.recommendation.toUpperCase()} — ${latestRun.handoff.rationale}`
      );
    }
    if (view.decision) {
      parts.push(`Already decided: ${view.decision.decision.toUpperCase()} by ${view.decision.officer}.`);
    }

    return {
      text: parts.join('\n'),
      applicationId: appId,
      suggestions: view.decision
        ? ['what should I review first']
        : [
            `investigate ${appId}`,
            view.progress.pipelineComplete
              ? `approve ${appId} note reviewed evidence and cleared`
              : `run the pipeline on ${appId}`,
          ],
    };
  }

  private queueLine(row: ConsoleQueueRow): string {
    const risk = row.riskScore === null ? 'unscored' : `risk ${row.riskScore} (${row.riskBand})`;
    const cluster = row.clusterSize > 1 ? `, linked to ${row.clusterSize - 1} other(s)` : '';
    return `${row.applicationId} — ${row.applicantName}, ${risk}${cluster}. ${row.headline}`;
  }

  /**
   * Optional LLM pass: rewrite the deterministic answer as tighter prose.
   * Grounded by construction — the model only sees facts already computed, and
   * a null/failed completion ships the deterministic text unchanged.
   */
  private async polish(question: string, draft: string, actions: ChatAction[]): Promise<string | null> {
    if (!this.llm.isEnabled()) return null;
    // Lists and queue read-outs are better verbatim than paraphrased.
    if (draft.includes('\n•') || /^\d+\./m.test(draft)) return null;

    const result = await this.llm.complete({
      system:
        'You are PassportIQ, a copilot for passport verification officers. Rewrite the draft ' +
        'answer in a crisp, professional voice. STRICT RULES: do not add, remove or alter any ' +
        'fact, number, application id, rule citation or recommendation; do not offer to approve ' +
        'or reject anything yourself; keep it under 120 words; no markdown headings.',
      prompt:
        `Officer asked: ${question}\n\nDraft answer (facts are authoritative):\n${draft}\n\n` +
        `Tools executed: ${actions.map((a) => a.tool).join(', ') || 'none'}\n\nRewrite:`,
      temperature: 0.4,
      maxOutputTokens: 300,
      timeoutMs: 8_000,
    });
    const text = result?.text?.trim();
    return text && text.length > 20 ? text : null;
  }

  // ---------------------------------------------------------------------------
  // Plumbing
  // ---------------------------------------------------------------------------

  /** Call a real MCP tool and record it as a chat action, success or refusal. */
  private async call(
    actions: ChatAction[],
    tool: string,
    input: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const result = await this.executor.call(tool, input);
      actions.push({ tool, ok: true, summary: 'ok' });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      actions.push({ tool, ok: false, summary: message.slice(0, 240) });
      throw error;
    }
  }

  /**
   * "PIQ-2026-2004" wins outright; a bare 4-digit number ("investigate 2004")
   * resolves against the live pool so chat feels like talking to a colleague
   * who knows the files, not a parser.
   */
  private resolveApplicationId(message: string): string | undefined {
    const exact = APP_ID_RE.exec(message)?.[0]?.toUpperCase();
    if (exact) return exact;

    const short = SHORT_ID_RE.exec(message)?.[1];
    if (!short) return undefined;
    const known = this.state.getPriorityOrder();
    return known.find((id) => id.endsWith(`-${short}`));
  }

  private parseDecision(lower: string): 'approve' | 'reject' | 'clarify' | null {
    if (/\bapprove\b/.test(lower)) return 'approve';
    if (/\breject\b|\bdeny\b/.test(lower)) return 'reject';
    if (/\bclarif|request (more )?info|ask (them|the applicant)/.test(lower)) return 'clarify';
    return null;
  }

  /** "… note documents verified in person" / "… note: checked at PSK" → the note. */
  private parseNote(message: string): string | undefined {
    const match = /\bnote:?\s+(.{4,300})$/i.exec(message);
    return match?.[1]?.trim();
  }

  private record(sessionId: string, turn: ChatTurn): void {
    if (!this.sessions.has(sessionId) && this.sessions.size >= MAX_SESSIONS) {
      const oldest = this.sessions.keys().next().value;
      if (oldest !== undefined) this.sessions.delete(oldest);
    }
    const turns = this.sessions.get(sessionId) ?? [];
    turns.push(turn);
    if (turns.length > MAX_TURNS_PER_SESSION) {
      turns.splice(0, turns.length - MAX_TURNS_PER_SESSION);
    }
    this.sessions.set(sessionId, turns);
  }

  private nextId(): string {
    this.turnCounter += 1;
    return `turn-${this.turnCounter}`;
  }
}
