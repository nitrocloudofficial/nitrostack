/**
 * plan_remediation's "minimum fix version" only clears the vulnerabilities
 * it already knew about from the original scan — it never re-checks
 * whether the *target* version itself carries its own, independently
 * discovered vulnerabilities. A real example that exposed this: bumping
 * axios 0.21.0 -> 0.21.2 clears the originally-scanned SSRF CVE, but
 * 0.21.2 itself still carries ~20 unrelated CVEs, because the whole 0.21.x
 * line predates axios's rewrite. verify_fix catches this after the fact —
 * this closes the gap earlier, at plan time, so the plan itself doesn't
 * quietly recommend a version that's still vulnerable.
 *
 * Capped at MAX_ESCALATIONS rounds so a package with a genuinely long tail
 * of unfixed history doesn't loop forever or hammer OSV with requests.
 */

import { queryBatch, getVulns } from "./osv.client.js";
import { compareVersions, type ParsedVersion } from "./semver.js";
import { minimalFixVersion } from "./fix-resolver.js";

const MAX_ESCALATIONS = 5;

export interface EscalationResult {
  target: ParsedVersion;
  escalations: number;
  notes: string[];
}

export async function escalateToCleanTarget(
  packageName: string,
  ecosystem: string,
  initialTarget: ParsedVersion,
  knownVulnIds: Set<string>
): Promise<EscalationResult> {
  let target = initialTarget;
  let escalations = 0;
  const notes: string[] = [];

  for (let i = 0; i < MAX_ESCALATIONS; i++) {
    const targetStr = `${target.major}.${target.minor}.${target.patch}`;
    const batch = await queryBatch([{ package: { name: packageName, ecosystem }, version: targetStr }]);
    const idsAtTarget = (batch[0]?.vulns ?? []).map((v) => v.id);
    const newIds = idsAtTarget.filter((id) => !knownVulnIds.has(id));
    if (newIds.length === 0) break;

    const records = await getVulns(newIds);
    let bumped = false;
    for (const record of records) {
      const fix = minimalFixVersion(target, record, ecosystem, packageName);
      if (fix && compareVersions(fix, target) > 0) {
        target = fix;
        bumped = true;
      }
      knownVulnIds.add(record.id);
    }

    if (!bumped) {
      notes.push(
        `${newIds.length} additional vulnerabilit${newIds.length === 1 ? "y" : "ies"} found at ${targetStr} with no further known fix in OSV — cannot escalate past this version.`
      );
      break;
    }

    escalations++;
    notes.push(
      `Escalated to ${target.major}.${target.minor}.${target.patch} after finding ${newIds.length} additional, ` +
        `independently-discovered vulnerabilit${newIds.length === 1 ? "y" : "ies"} at the previous target version.`
    );
  }

  if (escalations === MAX_ESCALATIONS) {
    notes.push(`Reached the ${MAX_ESCALATIONS}-round escalation cap — this package's history is deep enough that manual review of the target version is recommended.`);
  }

  return { target, escalations, notes };
}
