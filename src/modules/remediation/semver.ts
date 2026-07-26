/**
 * Minimal, dependency-free semver comparison — deliberately not the full
 * spec (no prerelease/build-metadata precedence rules). WARDEN already
 * disclaims that manifest versions are declared-range approximations, not
 * lockfile-resolved (see manifest-parser.ts); a hand-rolled major.minor.patch
 * comparator is the right amount of precision for that same honesty budget.
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

export function parseVersion(v: string): ParsedVersion | null {
  const match = v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw: v };
}

export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function isMajorBump(from: ParsedVersion, to: ParsedVersion): boolean {
  return to.major > from.major;
}
