import { UseGuards, ExecutionContext, z } from '@nitrostack/core';
import { Tool } from '../../common/validated-tool.js';
import { scopeGuard } from '../../common/auth/scope.guard.js';
import { READS_PUBLIC_DATA } from '../../common/tool-annotations.js';
import { OsvClient } from './osv.client.js';
import { analyzePackages } from './advisory.js';
import { lookupAdvisories } from './lookup.js';
import { parsePackageSpec } from './package-spec.js';
import { oneOrMany, toList } from '../../common/one-or-many.js';

const client = new OsvClient(); // one cache per instance

export class IntakeTools {
  @Tool({
    name: 'analyze_advisory',
    annotations: READS_PUBLIC_DATA,
    description:
      'Check advisories or installed packages against OSV. Use when the user asks whether a package version is safe or vulnerable ("is lodash 4.17.15 safe") or what a CVE or GHSA id is, what it affects and what changed. Give ids (CVE-, GHSA-, MAL-) to see which packages they affect and the fixed versions; give packages as "ecosystem:name@version" strings to see if you are affected, how severe, what fixes exist and whether it is urgent. Either or both. Read-only, needs a read key: nothing is changed, only OSV is queried. For a whole repository use assess_project; for exploited-in-the-wild status and EPSS use check_watch.',
    inputSchema: z.object({
      ids: oneOrMany(z.string().min(1).max(40), 10).optional().describe('Advisory ids, up to 10, e.g. GHSA-35jh-r3h4-6jhm'),
      packages: oneOrMany(z.string().min(3).max(300), 50).optional().describe('Installed packages, up to 50, as ecosystem:name@version, e.g. npm:lodash@4.17.15 or Packagist:guzzlehttp/guzzle@6.5.0')
    }),
    examples: {
      request: { packages: ['npm:lodash@4.17.15'] },
      response: { packages: [{ package: { name: 'lodash', version: '4.17.15' }, affected: true, findings: [{ id: 'GHSA-35jh-r3h4-6jhm', severity: 'high', fixedVersions: ['4.17.21'] }] }] }
    }
  })
  @UseGuards(scopeGuard('read'))
  async analyzeAdvisory(
    raw: { ids?: string | string[]; packages?: string | string[] },
    ctx: ExecutionContext
  ) {
    const input = { ids: toList(raw.ids), packages: toList(raw.packages) };
    if (!input.ids?.length && !input.packages?.length) {
      throw new Error('Nothing to check. Pass "ids" (for example ["GHSA-35jh-r3h4-6jhm"]) or "packages" as ecosystem:name@version strings (for example ["npm:lodash@4.17.15"]).');
    }
    ctx.logger.info('analyze_advisory', { ids: input.ids?.length ?? 0, packages: input.packages?.length ?? 0 });
    const refs = input.packages?.length ? input.packages.map(parsePackageSpec) : undefined;
    const advisories = input.ids?.length ? await lookupAdvisories(input.ids, client) : undefined;
    const packages = refs ? await analyzePackages(refs, { client }) : undefined;
    const bare = advisories?.some((a) => a.found && a.packages.length === 0);
    return {
      advisories,
      packages,
      hint: bare ? 'Some records have no package data (common for bare CVE ids). Try the matching GHSA id or pass "packages".' : undefined,
      nextStep: 'To check a whole repository call assess_project; for exploited-in-the-wild status and EPSS of a CVE call check_watch.'
    };
  }
}
