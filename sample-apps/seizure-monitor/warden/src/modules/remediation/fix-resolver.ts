/**
 * Reduces an OSV vulnerability record's affected[].ranges[].events into a
 * single "minimum version that clears this vulnerability" recommendation
 * for one package at one currently-declared version.
 */

import { parseVersion, compareVersions, type ParsedVersion } from "./semver.js";
import type { OsvVulnRecord } from "./osv.client.js";

/**
 * Returns the smallest fixed version greater than `current` for the given
 * package within this vuln record, or null if OSV has no fix event at all
 * for it yet (still open) or nothing in the record parses as semver.
 */
export function minimalFixVersion(
  current: ParsedVersion,
  record: OsvVulnRecord,
  ecosystem: string,
  packageName: string
): ParsedVersion | null {
  const fixedVersions: ParsedVersion[] = [];
  for (const affected of record.affected ?? []) {
    if (affected.package.ecosystem !== ecosystem || affected.package.name !== packageName) continue;
    for (const range of affected.ranges ?? []) {
      for (const event of range.events) {
        if (!event.fixed) continue;
        const parsed = parseVersion(event.fixed);
        if (parsed) fixedVersions.push(parsed);
      }
    }
  }
  if (fixedVersions.length === 0) return null;

  const clearsCurrent = fixedVersions.filter((v) => compareVersions(v, current) > 0);
  const pool = clearsCurrent.length > 0 ? clearsCurrent : fixedVersions;
  return pool.reduce((min, v) => (compareVersions(v, min) < 0 ? v : min));
}
