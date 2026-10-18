import { Injectable } from '@nitrostack/core';
import type { AnalysisContext, Finding, Signal } from '../signal.js';
import { finding, publisherOf, sameLine, TRUSTED_PUBLISHER } from './finding.js';

/**
 * Who pushed the release. A switch from trusted publishing (CI) to a personal account is the
 * axios 2026 pattern; a publisher who never released this package before is weaker evidence,
 * since maintainers do join projects.
 */
@Injectable()
export class PublisherChangeSignal implements Signal {
  readonly id = 'publisher-change';

  async evaluate(ctx: AnalysisContext): Promise<Finding[]> {
    const publisher = publisherOf(ctx.target);
    const history = sameLine(ctx.target, ctx.baseline)
      .map(publisherOf)
      .filter((p): p is string => Boolean(p));
    if (!publisher || history.length === 0) return [];

    // How many of the most recent releases in a row came from CI via trusted publishing.
    const streak = history.findIndex((p) => p !== TRUSTED_PUBLISHER);
    const ciRun = streak === -1 ? history.length : streak;
    if (publisher !== TRUSTED_PUBLISHER && ciRun >= 2) {
      return [
        finding(
          this.id,
          'high',
          `Published by the personal account "${publisher}" instead of the package's CI (trusted publishing)`,
          [
            `the last ${ciRun} releases were all published by ${TRUSTED_PUBLISHER}`,
            `${ctx.target.version} was published by ${publisher}`,
          ],
        ),
      ];
    }

    // Moving to CI with provenance is the healthy direction, not a takeover.
    if (publisher === TRUSTED_PUBLISHER && ctx.target.dist?.attestations) return [];

    if (!history.includes(publisher)) {
      const known = [...new Set(history)].slice(0, 5).join(', ');
      return [
        finding(this.id, 'warn', `New publisher "${publisher}" has never released this package before`, [
          `previous ${history.length} releases were published by: ${known}`,
        ]),
      ];
    }
    return [];
  }
}
