import { SEVERITY_WEIGHT, type Finding, type Severity, type VersionManifest } from '../signal.js';

/** Builds a finding whose weight follows its severity. */
export function finding(
  signal: string,
  severity: Severity,
  title: string,
  evidence: string[] = [],
): Finding {
  return { signal, severity, title, evidence, weight: SEVERITY_WEIGHT[severity] };
}

/** Lifecycle scripts npm runs automatically when a package is installed as a dependency. */
export const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'] as const;

export function installScripts(m: VersionManifest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of INSTALL_SCRIPTS) {
    const s = m.scripts?.[k];
    if (typeof s === 'string' && s.trim()) out[k] = s;
  }
  return out;
}

/**
 * Baseline releases of the target's major line (newest first), or the whole baseline if that
 * line has fewer than two. Projects often publish old maintenance lines differently: axios
 * 1.x came from CI with provenance while 0.30.x was published by hand.
 */
export function sameLine(target: VersionManifest, baseline: VersionManifest[]): VersionManifest[] {
  const major = target.version.split('.')[0];
  const line = baseline.filter((m) => m.version.split('.')[0] === major);
  return line.length >= 2 ? line : baseline;
}

export function hasProvenance(m: VersionManifest): boolean {
  return Boolean(m.dist?.attestations?.url);
}

/** npm shows trusted publishing (OIDC from CI) as this publisher name. */
export const TRUSTED_PUBLISHER = 'GitHub Actions';

export function publisherOf(m: VersionManifest): string | undefined {
  return m._npmUser?.name;
}

/** In replay mode, checks run as if the agent installed 30 minutes after publication. */
export const REPLAY_DELAY_HOURS = 0.5;

/** The simulated "now" of a replay, given the target's publish time. */
export function REPLAY_NOW(publishedIso: string | undefined): string {
  const t = publishedIso ? Date.parse(publishedIso) : Number.NaN;
  if (Number.isNaN(t)) return new Date().toISOString();
  return new Date(t + REPLAY_DELAY_HOURS * 3_600_000).toISOString();
}

export function hoursBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / 3_600_000;
}

export function formatAge(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round(hours / 24)} days`;
}
