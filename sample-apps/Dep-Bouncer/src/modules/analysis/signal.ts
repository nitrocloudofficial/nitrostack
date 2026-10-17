/**
 * Shared contract for every Dep Bouncer signal.
 *
 * A signal looks at one npm release (the target) next to the package's own history (the
 * baseline) and returns findings. Signals never execute package code and never throw on bad
 * data: they return an `info` finding instead.
 */

export type Severity = 'info' | 'warn' | 'high' | 'critical';

export interface Finding {
  /** Signal id, e.g. 'code-diff'. */
  signal: string;
  severity: Severity;
  /** One line, human readable. */
  title: string;
  /** Concrete facts: file paths, matched snippets (<= 120 chars), values. */
  evidence: string[];
  /** Contribution to the risk score (0-100). */
  weight: number;
  /** Coverage was incomplete; this release cannot be allowed or recommended as safe. */
  incomplete?: true;
}

/** Subset of an npm per-version manifest (registry.npmjs.org/<name>/<version>). */
export interface VersionManifest {
  name: string;
  version: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  _npmUser?: { name: string; email?: string };
  dist: {
    tarball: string;
    integrity?: string;
    unpackedSize?: number;
    attestations?: { url: string; provenance?: { predicateType: string } };
  };
}

/** Package contents: path inside the package (no leading "package/") -> file bytes. */
export type FileMap = Map<string, Uint8Array>;

/** Summary of another package, used to judge newly added dependencies. */
export interface PackageInfo {
  name: string;
  /** Packument time.created. */
  created?: string;
  /** Manifest of dist-tags.latest. */
  latest?: VersionManifest;
  /** Manifest of the version the requested range resolves to (what npm would install). */
  resolved?: VersionManifest;
  versionCount: number;
  weeklyDownloads?: number;
  /** True if OSV lists the resolved version as malware (MAL-). */
  knownMalicious?: boolean;
}

export interface AnalysisContext {
  name: string;
  target: VersionManifest;
  /** Previous versions of the same package, newest first (up to 10). May be empty. */
  baseline: VersionManifest[];
  /** Packument `time` map: version -> ISO publish time (also 'created', 'modified'). */
  time: Record<string, string>;
  /** Lazily loads a version's files (tarball). Throws on failure. */
  loadFiles(version: string): Promise<FileMap>;
  /** Weekly downloads of the package, if known. */
  weeklyDownloads?: number;
  /** Replay mode: data is a labelled reconstruction, not live registry data. */
  reconstructed?: boolean;
  /**
   * Looks up another package (e.g. a newly added dependency). With `range`, `resolved` is the
   * version npm would install for it. null if the package doesn't exist.
   */
  lookupPackage?(name: string, range?: string): Promise<PackageInfo | null>;
}

export interface Signal {
  readonly id: string;
  evaluate(ctx: AnalysisContext): Promise<Finding[]>;
}

/** Score contribution per severity, shared by all signals. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0,
  warn: 15,
  high: 35,
  critical: 70,
};
