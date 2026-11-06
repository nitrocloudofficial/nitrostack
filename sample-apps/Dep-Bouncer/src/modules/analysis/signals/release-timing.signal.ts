import { Injectable } from '@nitrostack/core';
import type { AnalysisContext, Finding, Signal } from '../signal.js';
import { finding, formatAge, hoursBetween, REPLAY_NOW } from './finding.js';

/**
 * Freshness on its own proves nothing, but every hijack in our benchmark was removed within a
 * day, and worms publish many versions in minutes. This is weak evidence that only adds
 * weight to other findings.
 */
@Injectable()
export class ReleaseTimingSignal implements Signal {
  readonly id = 'release-timing';

  async evaluate(ctx: AnalysisContext): Promise<Finding[]> {
    const published = ctx.time[ctx.target.version];
    if (!published || Number.isNaN(Date.parse(published))) return [];

    const out: Finding[] = [];
    const nowIso = ctx.reconstructed ? REPLAY_NOW(published) : new Date().toISOString();
    const age = hoursBetween(published, nowIso);
    if (age < 24) {
      out.push(
        finding(this.id, 'warn', `Published ${formatAge(age)} ago`, [
          `published ${published}`,
          'hijacked releases are usually caught and removed within hours; a 24 h cooldown would hold this release',
        ]),
      );
    }

    const window = 6;
    const burst = Object.entries(ctx.time).filter(([v, t]) => {
      if (v === 'created' || v === 'modified') return false;
      const d = hoursBetween(t, published);
      return d >= 0 && d <= window;
    });
    if (burst.length >= 4) {
      out.push(
        finding(this.id, 'warn', `${burst.length} versions published within ${window} h`, [
          burst
            .map(([v]) => v)
            .slice(0, 8)
            .join(', '),
        ]),
      );
    }
    return out;
  }
}
