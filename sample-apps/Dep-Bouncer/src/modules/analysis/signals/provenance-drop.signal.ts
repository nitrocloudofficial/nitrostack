import { Injectable } from '@nitrostack/core';
import type { AnalysisContext, Finding, Signal } from '../signal.js';
import { finding, hasProvenance, sameLine } from './finding.js';

/**
 * Provenance proves a release was built by a known CI workflow. A package that always had it
 * and suddenly ships a release without it was very likely published by hand with a stolen
 * token (nx 2025, axios 2026).
 */
@Injectable()
export class ProvenanceDropSignal implements Signal {
  readonly id = 'provenance-drop';

  async evaluate(ctx: AnalysisContext): Promise<Finding[]> {
    if (hasProvenance(ctx.target)) return [];
    const recent = sameLine(ctx.target, ctx.baseline).slice(0, 5);
    const withProvenance = recent.filter(hasProvenance);
    if (withProvenance.length === 0) return [];

    const evidence = [
      `${ctx.name}@${ctx.target.version} has no provenance attestation`,
      `${withProvenance.length} of the previous ${recent.length} releases had one ` +
        `(${withProvenance.map((m) => m.version).join(', ')})`,
    ];
    if (hasProvenance(recent[0])) {
      return [
        finding(
          this.id,
          'high',
          `Provenance dropped: previous release ${recent[0].version} was built and signed by CI, this one was not`,
          evidence,
        ),
      ];
    }
    return [finding(this.id, 'warn', 'Provenance is inconsistent across recent releases', evidence)];
  }
}
