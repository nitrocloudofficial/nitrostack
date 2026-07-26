/**
 * The Incident Commander — the COMMAND platform's domain-agnostic engine.
 *
 * One lifecycle serves every app:
 *
 *   DETECTED → DIAGNOSING → VERIFYING (self-heal loop until the fix proves out)
 *            → AWAITING_APPROVAL (only if confidence < threshold)
 *            → DEPLOYING → REPORTING → RESOLVED
 *                                    → ESCALATED (rejected / failed / gave up)
 *
 * Everything domain-specific lives behind a `DomainAdapter`. The two seams that
 * keep the engine framework-free (and identical across MCP, tests, and a Task):
 *
 *   • `planner`  — decides the next action (a tool call or a resolution). In an
 *                  MCP app this is backed by the client model / a Task strategy;
 *                  in tests it's a scripted array. The engine never calls an LLM.
 *   • `approvalGate` — resolves a below-threshold pause. In an MCP app this maps
 *                  to native tool-approval (HITL); in tests it's a boolean.
 *
 * Ported from the verified Python reference (`sentinel/orchestrator.py`).
 */

import { assess } from './confidence.js';
import type { DomainAdapter, EmitFn, IncidentContext } from './adapter.js';
import type { Incident, IncidentStatus, ToolResult } from './types.js';

export interface Resolution {
  rootCause: string;
  fixSummary: string;
  confidence: number;
}

/** One decision from the planner: call a tool, or submit the final resolution. */
export type EngineAction =
  | { type: 'tool'; name: string; args?: Record<string, unknown> }
  | { type: 'submit'; resolution: Resolution };

export interface PlannerState {
  incidentId: string;
  symptom: string;
  /** Every action taken so far and its result (results absent for submits). */
  history: Array<{ action: EngineAction; result?: ToolResult }>;
  /** True once the verify tool has passed since the last mutation. */
  lastVerified: boolean;
  turn: number;
}

/** Returns the next action, or null to give up (→ escalation). */
export type Planner = (state: PlannerState) => Promise<EngineAction | null> | EngineAction | null;

/** Resolves a below-threshold pause: true = approve & deploy, false = reject. */
export type ApprovalGate = (incident: Incident) => Promise<boolean> | boolean;

/**
 * A mandatory safety gate run before EVERY deploy, regardless of confidence.
 * Wired to AEGIS so every commander is self-governed — an unsafe action is
 * blocked even if the confidence gate would have auto-approved it.
 */
export type Guard = (incident: Incident) => Promise<GuardResult> | GuardResult;
export interface GuardResult {
  safe: boolean;
  reason: string;
  trustScore?: number;
}

/** Trace sink: every observable step. In MCP → emitEvent + widget; in tests → capture. */
export type OnEvent = (event: {
  incidentId: string;
  type: string;
  title: string;
  detail: Record<string, unknown>;
  ts: number;
}) => void | Promise<void>;

export interface EngineOptions {
  planner: Planner;
  approvalGate?: ApprovalGate;
  guard?: Guard;
  onEvent?: OnEvent;
  maxTurns?: number;
  threshold?: number;
}

const TERMINAL: ReadonlySet<IncidentStatus> = new Set(['RESOLVED', 'ESCALATED']);

export class Engine {
  private readonly adapter: DomainAdapter;
  private readonly planner: Planner;
  private readonly approvalGate: ApprovalGate;
  private readonly guard?: Guard;
  private readonly onEvent: OnEvent;
  private readonly maxTurns: number;
  private readonly threshold?: number;

  constructor(adapter: DomainAdapter, opts: EngineOptions) {
    this.adapter = adapter;
    this.planner = opts.planner;
    // Safe default: deny (→ escalate) unless a real HITL gate is wired in.
    this.approvalGate = opts.approvalGate ?? (() => false);
    this.guard = opts.guard;
    this.onEvent = opts.onEvent ?? (() => {});
    this.maxTurns = opts.maxTurns ?? 30;
    this.threshold = opts.threshold;
  }

  async runIncident(symptom: string): Promise<Incident> {
    const incident: Incident = {
      id: newIncidentId(),
      symptom,
      domain: this.adapter.key,
      status: 'DETECTED',
      diagnosis: '',
      fixSummary: '',
      diff: '',
      iterations: 0,
      verdict: null,
      actions: [],
      approvalNote: '',
      openedAt: Date.now(),
      closedAt: null,
    };
    await this.emit(incident, 'incident.opened',
      `Incident opened: ${symptom.split('\n')[0].slice(0, 120)}`,
      { symptom, domain: this.adapter.key, domainName: this.adapter.displayName });

    let ctx: IncidentContext | undefined;
    try {
      await this.setStatus(incident, 'DIAGNOSING');
      ctx = await this.adapter.openContext(incident.id);
      ctx.emit = this.emitterFor(incident);

      const resolution = await this.agentLoop(incident, ctx);
      if (!resolution) {
        await this.escalate(incident, ctx, 'agent could not produce a verified fix');
        return incident;
      }

      incident.diagnosis = resolution.rootCause;
      incident.fixSummary = resolution.fixSummary;
      incident.diff = this.adapter.diff(ctx);

      // ── autonomy gate ──
      const blast = this.adapter.blastRadius(ctx);
      const verdict = assess({
        verificationPassed: true,
        agentConfidence: resolution.confidence,
        iterationsUsed: Math.max(incident.iterations, 1),
        blastScore: blast.score,
        blastReason: blast.reason,
        threshold: this.threshold,
      });
      incident.verdict = verdict;
      await this.emit(incident, 'confidence.verdict',
        `Confidence ${verdict.score.toFixed(2)} vs threshold ${verdict.threshold.toFixed(2)} — ` +
        (verdict.autonomous ? 'autonomous deploy' : 'human approval required'),
        verdict as unknown as Record<string, unknown>);

      if (!verdict.autonomous) {
        await this.setStatus(incident, 'AWAITING_APPROVAL');
        await this.emit(incident, 'approval.requested', 'Awaiting human approval',
          { diff: incident.diff, verdict });
        const approved = await this.approvalGate(incident);
        if (!approved) {
          await this.emit(incident, 'approval.rejected', 'Human rejected the fix',
            { note: incident.approvalNote });
          await this.escalate(incident, ctx, `fix rejected by human: ${incident.approvalNote}`);
          return incident;
        }
        await this.emit(incident, 'approval.granted', 'Human approved the fix',
          { note: incident.approvalNote });
      }

      // ── mandatory trust gate (AEGIS) — runs before every deploy ──
      if (this.guard) {
        const g = await this.guard(incident);
        await this.emit(incident, 'trust.checked',
          `AEGIS trust ${g.trustScore ?? ''}${g.trustScore !== undefined ? ' — ' : ''}${g.safe ? 'cleared' : 'BLOCKED'}: ${g.reason}`,
          g as unknown as Record<string, unknown>);
        if (!g.safe) {
          await this.escalate(incident, ctx, `AEGIS blocked the action — ${g.reason}`);
          return incident;
        }
      }

      // ── deploy ──
      await this.setStatus(incident, 'DEPLOYING');
      const promoted = await this.adapter.deploy(ctx);
      await this.emit(incident, 'deploy.promoted', `Change deployed: ${promoted.join(', ')}`,
        { units: promoted });

      const recovered = await this.adapter.awaitRecovery(ctx);
      if (!recovered) {
        await this.escalate(incident, ctx, 'system did not recover after deploy');
        return incident;
      }

      // ── report ──
      await this.setStatus(incident, 'REPORTING');
      incident.actions = await this.adapter.report(incident, ctx);

      incident.closedAt = Date.now();
      await this.setStatus(incident, 'RESOLVED');
      await this.emit(incident, 'incident.resolved',
        `Resolved in ${Math.round((incident.closedAt - incident.openedAt) / 1000)}s: ${incident.fixSummary}`,
        { durationS: Math.round((incident.closedAt - incident.openedAt) / 1000) });
      return incident;
    } catch (err) {
      await this.emit(incident, 'incident.error', `Pipeline error: ${errMsg(err)}`,
        { error: errMsg(err) });
      if (ctx) await this.escalate(incident, ctx, `pipeline error: ${errMsg(err)}`);
      else await this.escalate(incident, undefined, `pipeline error: ${errMsg(err)}`);
      return incident;
    } finally {
      try {
        await ctx?.cleanup?.();
      } catch {
        /* cleanup must never mask the outcome */
      }
    }
  }

  // ── the loop ──
  private async agentLoop(incident: Incident, ctx: IncidentContext): Promise<Resolution | null> {
    const state: PlannerState = {
      incidentId: incident.id,
      symptom: incident.symptom,
      history: [],
      lastVerified: false,
      turn: 0,
    };

    for (let turn = 0; turn < this.maxTurns; turn++) {
      state.turn = turn;
      const action = await this.planner(state);
      if (!action) return null;

      if (action.type === 'submit') {
        if (!state.lastVerified) {
          const result: ToolResult = {
            data: { error: `Refused: ${this.adapter.verifyTool} has not passed since the last change. Verify first.` },
            isError: true,
          };
          await this.emit(incident, 'tool.blocked',
            `${this.adapter.submitTool} blocked — not verified`, result.data);
          state.history.push({ action, result });
          continue;
        }
        await this.emit(incident, 'agent.resolution', action.resolution.fixSummary,
          action.resolution as unknown as Record<string, unknown>);
        return action.resolution;
      }

      const { name } = action;
      const args = action.args ?? {};
      await this.emit(incident, 'tool.call', `${name}(${shortArgs(args)})`, { tool: name, args });
      if (name === this.adapter.verifyTool && incident.status !== 'VERIFYING') {
        await this.setStatus(incident, 'VERIFYING');
      }

      let result: ToolResult;
      try {
        result = await this.adapter.executeTool(ctx, name, args);
      } catch (err) {
        await this.emit(incident, 'tool.error', `${name} failed: ${errMsg(err)}`, { error: errMsg(err) });
        result = { data: { error: errMsg(err) }, isError: true };
      }

      if (name === this.adapter.verifyTool) {
        incident.iterations += 1;
        state.lastVerified = this.adapter.verificationPassed(result.data);
      } else if (this.adapter.mutationTools.has(name) && !result.isError) {
        state.lastVerified = false;
      }
      state.history.push({ action, result });
    }

    await this.emit(incident, 'agent.exhausted', 'Turn limit reached without a resolution', {});
    return null;
  }

  // ── helpers ──
  private emitterFor(incident: Incident): EmitFn {
    return (type, title, detail) => this.emit(incident, type, title, detail ?? {});
  }

  private async emit(incident: Incident, type: string, title: string, detail: Record<string, unknown>): Promise<void> {
    await this.onEvent({ incidentId: incident.id, type, title, detail, ts: Date.now() });
  }

  private async setStatus(incident: Incident, status: IncidentStatus): Promise<void> {
    incident.status = status;
    await this.emit(incident, 'incident.status', `Status → ${status}`, { status });
  }

  private async escalate(incident: Incident, ctx: IncidentContext | undefined, reason: string): Promise<void> {
    incident.closedAt = Date.now();
    await this.setStatus(incident, 'ESCALATED');
    if (this.adapter.notifyEscalation && ctx) {
      try {
        incident.actions.push(...(await this.adapter.notifyEscalation(incident, reason, ctx.emit)));
      } catch {
        /* alerting must never mask the escalation */
      }
    }
    await this.emit(incident, 'incident.escalated', `Escalated: ${reason}`, { reason });
  }

  isTerminal(incident: Incident): boolean {
    return TERMINAL.has(incident.status);
  }
}

// ── module helpers ──
function newIncidentId(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rand = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `INC-${stamp}-${rand}`;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function shortArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => {
      const s = String(v).replace(/\n/g, ' ');
      return `${k}=${s.slice(0, 40)}${s.length > 40 ? '…' : ''}`;
    })
    .join(', ');
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));
