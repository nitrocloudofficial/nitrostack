/**
 * Explainable confidence scoring — the autonomy gate (ported from the Python
 * reference implementation, unchanged in behaviour).
 *
 * COMMAND never acts on gut feeling. Each resolution is scored from independent,
 * auditable signals; the full breakdown ships with the verdict so a human — or
 * an auditor, later — can see exactly *why* the agent was allowed (or not) to
 * act on its own. The blast-radius signal is normalised to [0, 1] by each
 * domain adapter, so this one gate serves every app.
 *
 * Resolutions at or above the threshold act autonomously; anything below pauses
 * for human approval (the HITL gate, native to MCP tool-approval).
 */

import type { Verdict, VerdictComponent } from './types.js';

export const WEIGHTS = {
  verification: 0.4, // did the fix prove out (tests green / simulation clean)?
  agent: 0.25, //        the agent's own calibrated confidence
  iterations: 0.2, //    fewer attempts -> more confident diagnosis
  blastRadius: 0.15, //  smaller changes are safer to auto-act
} as const;

const clamp01 = (n: number): number => Math.min(Math.max(n, 0), 1);

/** Default gate threshold; overridable via SENTINEL_CONFIDENCE_THRESHOLD. */
export function defaultThreshold(): number {
  const raw = Number.parseFloat(process.env.SENTINEL_CONFIDENCE_THRESHOLD ?? '');
  return Number.isFinite(raw) ? raw : 0.8;
}

export interface AssessInput {
  verificationPassed: boolean;
  agentConfidence: number;
  iterationsUsed: number;
  blastScore: number;
  blastReason: string;
  threshold?: number;
}

/** Combine independent signals into one explainable score. */
export function assess(input: AssessInput): Verdict {
  const threshold = input.threshold ?? defaultThreshold();
  const agentConfidence = clamp01(input.agentConfidence);
  const blastScore = clamp01(input.blastScore);

  const verifyScore = input.verificationPassed ? 1 : 0;
  // 1 attempt -> 1.0, each extra attempt costs 25%, floored at 0.
  const iterScore = Math.max(0, 1 - 0.25 * Math.max(input.iterationsUsed - 1, 0));

  const components: Record<string, VerdictComponent> = {
    verification: {
      score: verifyScore,
      weight: WEIGHTS.verification,
      reason: input.verificationPassed ? 'fix verified (all checks green)' : 'not verified',
    },
    agent: {
      score: agentConfidence,
      weight: WEIGHTS.agent,
      reason: `agent self-reported confidence ${agentConfidence.toFixed(2)}`,
    },
    iterations: {
      score: round3(iterScore),
      weight: WEIGHTS.iterations,
      reason: `converged in ${input.iterationsUsed} attempt(s)`,
    },
    blastRadius: {
      score: round3(blastScore),
      weight: WEIGHTS.blastRadius,
      reason: input.blastReason,
    },
  };

  const score = Object.values(components).reduce((sum, c) => sum + c.score * c.weight, 0);

  return {
    score: round3(score),
    threshold,
    autonomous: score >= threshold,
    components,
  };
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
