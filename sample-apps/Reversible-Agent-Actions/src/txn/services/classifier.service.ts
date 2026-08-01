import { Injectable } from '@nitrostack/core';
import type { CompensatorSpec, ReversibilityClass } from '../types.js';

/**
 * Returns the decayed reversibility class if spec.window has elapsed between
 * `at` and `now`, or null if no decay applies (no window, or window not yet elapsed).
 * Used by the rollback orchestrator to re-evaluate each step individually.
 */
export function classifyDecay(spec: CompensatorSpec, at: Date, now: Date): ReversibilityClass | null {
  if (spec.window === undefined) return null;
  const elapsed = now.getTime() - at.getTime();
  if (elapsed <= spec.window) return null;
  return spec.decaysTo ?? 'TERMINAL';
}

/** Classifies steps into the 5-class reversibility taxonomy, statically and with time-based decay. */
@Injectable()
export class ReversibilityClassifier {
  /** Classifies at preflight/planning time — no time dependency. */
  classifyStatic(spec: CompensatorSpec | null): ReversibilityClass {
    if (spec === null || spec.inverse === null) return 'TERMINAL';
    if (spec.counteractionOnly) return 'MITIGABLE';
    if (spec.leavesTrace) return 'TOMBSTONED';
    if (spec.requiresPreRead) return 'RESTORATIVE';
    return 'CLEAN';
  }

  /** Classifies at rollback time — accounts for decay and the actual pre-read capture result. */
  classify(params: { spec: CompensatorSpec | null; prior: unknown | null; at?: Date; now?: Date }): ReversibilityClass {
    const { spec, prior, at, now = new Date() } = params;

    if (spec === null || spec.inverse === null) return 'TERMINAL';

    // CRITICAL INVARIANT: no prior state captured → cannot restore → TERMINAL, not RESTORATIVE.
    if (spec.requiresPreRead && prior === null) return 'TERMINAL';

    if (at !== undefined) {
      const decayed = classifyDecay(spec, at, now);
      if (decayed !== null) return decayed;
    }

    if (spec.counteractionOnly) return 'MITIGABLE';
    if (spec.leavesTrace) return 'TOMBSTONED';
    if (spec.requiresPreRead) return 'RESTORATIVE';
    return 'CLEAN';
  }

  /** Returns a one-sentence human explanation of a classification for the widget. */
  rationale(cls: ReversibilityClass, spec: CompensatorSpec | null): string {
    switch (cls) {
      case 'CLEAN':
        return 'Fully reversible — will be deleted/revoked with no trace.';
      case 'RESTORATIVE':
        return 'Reversible — prior value captured and will be written back.';
      case 'TOMBSTONED':
        return 'Reversible — but a deletion marker will remain visible.';
      case 'MITIGABLE':
        return 'Not reversible — a counteracting action will be issued instead.';
      case 'TERMINAL':
        return 'Irreversible — ' + (spec?.manualInstruction ?? 'no automated recovery possible.');
    }
  }
}

// ✓ VERIFY (inline):
//
// const c = new ReversibilityClassifier();
// c.classify({ spec: null, prior: null }) → 'TERMINAL'
// c.classify({ spec: { toolName: 't', server: 's', requiresPreRead: true, inverse: 'x' } as CompensatorSpec, prior: null }) → 'TERMINAL'
// c.classify({ spec: { toolName: 't', server: 's', requiresPreRead: false, inverse: 'x', leavesTrace: false, counteractionOnly: false } as CompensatorSpec, prior: null }) → 'CLEAN'
