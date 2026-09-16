/**
 * The `DomainAdapter` contract — the pluggable edge of the COMMAND platform.
 *
 * The engine (`engine.ts`) runs one lifecycle for every incident and knows
 * nothing about microservices, cloud bills, contracts, or civic forms. Each of
 * the five apps supplies exactly one adapter; writing a new domain is
 * implementing this interface and nothing else. Ported from the verified Python
 * reference (`sentinel/adapters/base.py`).
 */

import type { BlastRadius, Incident, ToolResult } from './types.js';

/** Async emitter the engine injects into each context: emit(type, title, detail). */
export type EmitFn = (
  type: string,
  title: string,
  detail?: Record<string, unknown>,
) => void | Promise<void>;

/** Health/observation snapshot for poll-driven domains (DevOps). */
export interface HealthSnapshot {
  reachable: boolean;
  healthy: boolean;
  [key: string]: unknown;
}

/**
 * Per-incident working state owned by an adapter (a sandbox, a cost model…).
 * The engine treats it opaquely and only injects `emit`. Adapters extend this
 * with whatever they need.
 */
export interface IncidentContext {
  readonly incidentId: string;
  emit: EmitFn;
  cleanup?(): void | Promise<void>;
}

/** Tool-loop semantics + capabilities the engine drives generically. */
export interface DomainAdapter {
  readonly key: string;
  readonly displayName: string;
  readonly tagline: string;

  /** The tool that ends the loop with a resolution. */
  readonly submitTool: string;
  /** The tool that proves the fix; each call counts as one iteration. */
  readonly verifyTool: string;
  /** Tools that change state and thus invalidate a prior verification. */
  readonly mutationTools: ReadonlySet<string>;

  systemPrompt(): string;
  framing(symptom: string): string;
  openContext(incidentId: string): IncidentContext | Promise<IncidentContext>;

  executeTool(
    ctx: IncidentContext,
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult>;

  /** Given a verifyTool result's data, did verification pass? */
  verificationPassed(result: Record<string, unknown>): boolean;

  /** Normalised risk of the staged change, for the autonomy gate. */
  blastRadius(ctx: IncidentContext): BlastRadius;

  /** Unified-diff-style view of the change (for humans / PRs / widgets). */
  diff(ctx: IncidentContext): string;

  /** Promote the verified change to production; return the units changed. */
  deploy(ctx: IncidentContext): Promise<string[]>;

  /** Confirm the system actually recovered; emits its own deploy.* events. */
  awaitRecovery(ctx: IncidentContext): Promise<boolean>;

  /** Fan out post-resolution reports; return action records for the audit. */
  report(incident: Incident, ctx: IncidentContext): Promise<Array<Record<string, unknown>>>;

  // ── optional sensors / hooks ───────────────────────────────────────────────
  probeHealth?(): Promise<HealthSnapshot>;
  buildSymptom?(health: HealthSnapshot): string;
  notifyEscalation?(
    incident: Incident,
    reason: string,
    emit: EmitFn,
  ): Promise<Array<Record<string, unknown>>>;
}
