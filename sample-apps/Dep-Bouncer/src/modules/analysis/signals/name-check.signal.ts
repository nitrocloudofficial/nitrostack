import { Injectable } from '@nitrostack/core';
import type { AnalysisContext, Finding, Signal } from '../signal.js';
import { SEVERITY_WEIGHT } from '../signal.js';
import { findLookalikes } from '../name-similarity.js';
import { loadPopularPackages } from '../popular-packages.js';

@Injectable()
export class NameCheckSignal implements Signal {
  readonly id = 'name-check';

  async evaluate(ctx: AnalysisContext): Promise<Finding[]> {
    const popular = await loadPopularPackages();
    const [match] = findLookalikes(ctx.name, popular);
    if (!match) return [];
    const createdMs = ctx.time.created ? Date.parse(ctx.time.created) : Number.NaN;
    const recentlyCreated = Number.isFinite(createdMs) && Date.now() - createdMs < 90 * 24 * 60 * 60 * 1000;
    const suspicious = (ctx.weeklyDownloads ?? 0) < 10_000 || recentlyCreated;
    return [{
      signal: this.id,
      severity: suspicious ? 'high' : 'info',
      title: suspicious ? 'Package name resembles a popular package' : 'Package name resembles an established package',
      evidence: [`looks like ${match.name} (distance ${match.distance}, ${match.kind})`],
      weight: SEVERITY_WEIGHT[suspicious ? 'high' : 'info'],
    }];
  }
}
