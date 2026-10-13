import { Injectable } from '@nitrostack/core';
import type { CompensatorSpec, ReversibilityClass } from '../types.js';
import { CompensatorRegistry } from './registry.service.js';

// TODO(P4): replace this local stub with the real import once
// ReversibilityClassifier lands in src/txn/services/classifier.service.ts.
interface ReversibilityClassifier {
  classifyStatic(spec: CompensatorSpec | null): ReversibilityClass;
}

/** Result of a preflight analysis over a planned sequence of tool calls. */
export interface PreflightResult {
  steps: Array<{ seq: number; toolName: string; reversibility: ReversibilityClass; rationale: string }>;
  pivotIndex: number | null;
  strandedReversibleSteps: number;
  reorderRecommended: boolean;
  suggestedOrder: string[];
  /** e.g. "7 actions · 2 clean · 1 restorative · 2 tombstoned · 1 mitigable · 1 terminal" */
  summary: string;
}

const CLASS_ORDER: ReversibilityClass[] = ['CLEAN', 'RESTORATIVE', 'TOMBSTONED', 'MITIGABLE', 'TERMINAL'];

/** Analyses a planned sequence of tool calls for reversibility risk before execution. */
@Injectable({ deps: [CompensatorRegistry] })
export class PreflightPlanner {
  constructor(
    private registry: CompensatorRegistry,
    private classifier: ReversibilityClassifier
  ) {}

  analyse(steps: Array<{ toolName: string; input?: unknown }>): PreflightResult {
    const analysed = steps.map((step, index) => {
      const spec = this.registry.lookup(step.toolName);
      const reversibility = this.classifier.classifyStatic(spec);
      const rationale = spec
        ? `Registered compensator (inverse: ${spec.inverse ?? 'none'})`
        : 'No compensator registered — treated as TERMINAL';
      return { seq: index + 1, toolName: step.toolName, reversibility, rationale };
    });

    const pivotIndex = analysed.findIndex((s) => s.reversibility === 'TERMINAL');
    const resolvedPivotIndex = pivotIndex === -1 ? null : pivotIndex;

    const strandedReversibleSteps =
      resolvedPivotIndex === null
        ? 0
        : analysed.filter((s, i) => i > resolvedPivotIndex && s.reversibility !== 'TERMINAL').length;

    const nonTerminal = analysed.filter((s) => s.reversibility !== 'TERMINAL');
    const terminal = analysed.filter((s) => s.reversibility === 'TERMINAL');
    const suggestedOrder = [...nonTerminal, ...terminal].map((s) => s.toolName);

    const byClass: Record<ReversibilityClass, number> = {
      CLEAN: 0,
      RESTORATIVE: 0,
      TOMBSTONED: 0,
      MITIGABLE: 0,
      TERMINAL: 0,
    };
    for (const s of analysed) {
      byClass[s.reversibility]++;
    }
    const summary = [
      `${analysed.length} actions`,
      ...CLASS_ORDER.map((cls) => `${byClass[cls]} ${cls.toLowerCase()}`),
    ].join(' · ');

    return {
      steps: analysed,
      pivotIndex: resolvedPivotIndex,
      strandedReversibleSteps,
      reorderRecommended: strandedReversibleSteps > 0,
      suggestedOrder,
      summary,
    };
  }
}
