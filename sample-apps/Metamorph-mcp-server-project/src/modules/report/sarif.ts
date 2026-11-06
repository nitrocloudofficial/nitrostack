// SARIF 2.1.0 export. One rule per distinct finding id; one result per finding, and every result has a physicalLocation
// (GitHub code scanning can reject results without one). Where the location comes from, in order:
//   1. dependency findings (dep-vulnerable:<pkg>, node-deprecated-package): the manifest that declares the package, else
//      the lockfile, with the line of the package name when the file text is available (ReportData.manifests);
//   2. evidence that is exactly "path:line" or a bare file path;
//   3. fallback: the project manifest (package.json or composer.json by rule family and stack), else README.md, with a note
//      in the message and properties.locationKind = "project-manifest-fallback". The fallback names a file, never a line.
// A line is only ever a line found in the file text. When it cannot be found the region is omitted (SARIF allows an
// artifactLocation without a region); nothing is invented. Paths are relative to the analysed folder (uriBaseId SRCROOT);
// versionControlProvenance.mappedTo maps SRCROOT back to the subfolder.
import type { ReportData, ReportFinding } from './report-data.js';
import { TOOL_NAME, TOOL_VERSION } from './report-data.js';

export const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';

type Level = 'error' | 'warning' | 'note';
const LEVEL: Record<ReportFinding['severity'], Level> = { critical: 'error', high: 'error', medium: 'warning', low: 'note', info: 'note' };
// Rough bands used by GitHub for "security-severity" when no CVSS score is known.
const DEFAULT_SECURITY_SEVERITY: Record<ReportFinding['severity'], string> = { critical: '9.5', high: '8.0', medium: '5.5', low: '3.0', info: '0.0' };

export interface SarifLocation {
  path: string;
  line?: number;
}

// The extension must contain a letter, so a version such as "8.4.27" or "7.4" is not read as a file name.
const LOCATION_RE = /^([A-Za-z0-9_@.-][A-Za-z0-9_@./-]*\.(?=[A-Za-z0-9]{1,8}(?::|$))[0-9]*[A-Za-z][A-Za-z0-9]*)(?::(\d{1,7}))?$/;

export function locationOf(evidence: string | undefined): SarifLocation | undefined {
  if (!evidence) return undefined;
  const m = evidence.trim().match(LOCATION_RE);
  if (!m) return undefined;
  const p = m[1];
  if (p.startsWith('/') || p.split('/').includes('..')) return undefined;
  const line = m[2] ? Number(m[2]) : undefined;
  return line !== undefined && line >= 1 ? { path: p, line } : { path: p };
}

export type LocationKind = 'declaring-manifest' | 'evidence' | 'project-manifest-fallback';
export interface ResolvedLocation extends SarifLocation {
  kind: LocationKind;
  note?: string;
}

const DEP_RULE = /^(?:dep-vulnerable:(.+)|node-deprecated-package)$/;
const SECTIONS: Record<string, string[]> = {
  'package.json': ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'],
  'composer.json': ['require', 'require-dev']
};
const escapeRe = (v: string): string => v.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

// 1-based line of the key `name` inside one of the dependency sections of a manifest, or undefined when not found.
export function lineOfDeclaration(file: 'package.json' | 'composer.json', text: string, name: string): number | undefined {
  const lines = text.split(/\r\n|\r|\n/);
  const sections = new RegExp(`"(${SECTIONS[file].join('|')})"\\s*:\\s*\\{`);
  const key = new RegExp(`"${escapeRe(name)}"\\s*:`, file === 'composer.json' ? 'i' : '');
  let depth = -1; // brace depth counted from the opening of a dependency section; -1 = outside
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (depth < 0) {
      const sec = sections.exec(line);
      if (!sec) continue;
      // same-line content after the opening brace (minified or single-line sections)
      const rest = line.slice(sec.index + sec[0].length);
      if (key.test(rest)) return i + 1;
      depth = 1 + (rest.match(/\{/g)?.length ?? 0) - (rest.match(/\}/g)?.length ?? 0);
      if (depth <= 0) depth = -1;
      continue;
    }
    if (depth === 1 && key.test(line)) return i + 1;
    depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
    if (depth <= 0) depth = -1;
  }
  return undefined;
}

// Line where a lockfile records the package: npm lockfile "node_modules/<name>" (v2/v3) or a v1 "<name>" key; composer.lock "name": "<name>".
export function lineOfLockEntry(file: 'package-lock.json' | 'composer.lock', text: string, name: string): number | undefined {
  const lines = text.split(/\r\n|\r|\n/);
  const n = escapeRe(name);
  const re = file === 'composer.lock' ? new RegExp(`"name"\\s*:\\s*"${n}"`, 'i') : new RegExp(`"(?:[^"]*node_modules/)?${n}"\\s*:\\s*\\{`);
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
  return undefined;
}

const prefixOf = (project: string | undefined): string => (project ? `${project.replace(/\/+$/, '')}/` : '');

function manifestOrder(f: ReportFinding, d: ReportData, name: string | undefined): Array<'package.json' | 'composer.json'> {
  const dep = name ? d.dependencies.find((x) => x.name === name || x.name.toLowerCase() === name.toLowerCase()) : undefined;
  if (dep) return [dep.ecosystem === 'npm' ? 'package.json' : 'composer.json'];
  if (/^(?:composer|php)-/.test(f.id)) return ['composer.json'];
  if (f.id.startsWith('node-')) return ['package.json'];
  return ['package.json', 'composer.json'];
}

export function resolveLocation(f: ReportFinding, d: ReportData): ResolvedLocation {
  const texts = d.manifests ?? {};
  const pre = prefixOf(f.project);
  const dep = DEP_RULE.exec(f.id);
  if (dep) {
    // dep-vulnerable:<name> carries the name in its id; node-deprecated-package carries it as its evidence
    const name = dep[1] ?? f.evidence;
    if (name) {
      for (const m of manifestOrder(f, d, name)) {
        const lock = m === 'package.json' ? 'package-lock.json' : 'composer.lock';
        const mText = texts[pre + m];
        const lText = texts[pre + lock];
        const mLine = mText !== undefined ? lineOfDeclaration(m, mText, name) : undefined;
        if (mLine !== undefined) return { path: pre + m, line: mLine, kind: 'declaring-manifest' };
        const lLine = lText !== undefined ? lineOfLockEntry(lock, lText, name) : undefined;
        if (lLine !== undefined) return { path: pre + lock, line: lLine, kind: 'declaring-manifest' };
        // The manifest exists but the name was not found in it (or the text was not available): point at the file, no line.
        if (mText !== undefined || Object.keys(texts).length === 0) {
          return { path: pre + m, kind: 'declaring-manifest', note: mText !== undefined ? `${name} was not found by name in ${m}; the line is unknown` : `line unknown (file text not available to the report)` };
        }
      }
    }
  } else {
    const ev = locationOf(f.evidence);
    if (ev) return { ...ev, kind: 'evidence' }; // evidence paths are repository-relative as the scanner saw them
  }
  // Fallback: the project manifest, else the README. A file, not a line.
  const order = manifestOrder(f, d, undefined);
  const known = order.find((m) => texts[pre + m] !== undefined) ?? (['package.json', 'composer.json'] as const).find((m) => texts[pre + m] !== undefined);
  const byStack = d.stack === 'php' ? 'composer.json' : d.stack === 'node' || d.stack === 'mixed' ? 'package.json' : undefined;
  const file = known ?? (Object.keys(texts).length === 0 ? (order.length === 1 ? order[0] : byStack) : undefined);
  if (file) return { path: pre + file, kind: 'project-manifest-fallback', note: `no file location for this finding; pointing at the project manifest ${file}` };
  return { path: `${pre}README.md`, kind: 'project-manifest-fallback', note: 'no file location for this finding and no manifest was read; pointing at the README' };
}

function tagsOf(f: ReportFinding): string[] {
  const tags = new Set<string>(['security', f.category]);
  for (const c of f.cwe) tags.add(`external/cwe/${c.toLowerCase()}`);
  for (const o of f.owasp) tags.add(`external/owasp/${o}`);
  if (f.kev) tags.add('cisa-kev');
  return [...tags];
}

export function buildSarif(d: ReportData): Record<string, unknown> {
  const ruleIndex = new Map<string, number>();
  const rules: Array<Record<string, unknown>> = [];
  for (const f of d.findings) {
    if (ruleIndex.has(f.id)) continue;
    ruleIndex.set(f.id, rules.length);
    rules.push({
      id: f.id,
      shortDescription: { text: f.title || f.id },
      help: { text: f.recommendation || 'See the finding message.' },
      defaultConfiguration: { level: LEVEL[f.severity] },
      properties: {
        tags: tagsOf(f),
        'security-severity': f.cvss ? f.cvss.value.toFixed(1) : DEFAULT_SECURITY_SEVERITY[f.severity]
      }
    });
  }

  // WS8: deduplicated findings of the runner tools, as additional results of the same run. properties.sources lists every tool that
  // reported the finding; ruleIds start with "runner-" so they never collide with the static assessment's ids.
  for (const f of d.measured?.findings ?? []) {
    if (ruleIndex.has(f.id)) continue;
    ruleIndex.set(f.id, rules.length);
    rules.push({
      id: f.id,
      shortDescription: { text: f.title || f.id },
      help: { text: f.recommendation || 'See the finding message.' },
      defaultConfiguration: { level: LEVEL[f.severity] },
      properties: { tags: tagsOf(f), 'security-severity': f.cvss ? f.cvss.value.toFixed(1) : DEFAULT_SECURITY_SEVERITY[f.severity] }
    });
  }

  const results = d.findings.map((f) => {
    const loc = resolveLocation(f, d);
    return {
      ruleId: f.id,
      ruleIndex: ruleIndex.get(f.id) ?? 0,
      level: LEVEL[f.severity],
      message: { text: `${f.title}${f.evidence ? ` (${f.evidence})` : ''}. ${f.recommendation}${loc.note ? ` (Location: ${loc.note}.)` : ''}`.trim() },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: loc.path, uriBaseId: 'SRCROOT' },
            ...(loc.line !== undefined ? { region: { startLine: loc.line } } : {})
          }
        }
      ],
      properties: {
        locationKind: loc.kind,
        severity: f.severity,
        category: f.category,
        ...(f.cvss ? { cvss: f.cvss.value, 'cvss-origin': f.cvss.origin } : {}),
        ...(f.epss ? { epss: f.epss.value, 'epss-origin': f.epss.origin } : {}),
        ...(f.kev ? { kev: true } : {})
      }
    };
  });

  const measuredResults = (d.measured?.findings ?? []).map((f) => {
    const loc = resolveLocation(f, d);
    return {
      ruleId: f.id,
      ruleIndex: ruleIndex.get(f.id) ?? 0,
      level: LEVEL[f.severity],
      message: { text: `${f.title}${f.evidence ? ` (${f.evidence})` : ''}. ${f.recommendation} Reported by: ${f.sources.join(', ')}.${loc.note ? ` (Location: ${loc.note}.)` : ''}`.trim() },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: loc.path, uriBaseId: 'SRCROOT' },
            ...(loc.line !== undefined ? { region: { startLine: loc.line } } : {})
          }
        }
      ],
      properties: {
        locationKind: loc.kind,
        severity: f.severity,
        category: f.category,
        origin: d.measured?.origin,
        sources: f.sources,
        rankReason: f.rankReason,
        ...(f.aliases.length ? { aliases: f.aliases } : {}),
        ...(f.package ? { package: f.package } : {}),
        ...(f.severityNote ? { severityNote: f.severityNote } : {}),
        ...(f.cvss ? { cvss: f.cvss.value, 'cvss-origin': f.cvss.origin } : {}),
        ...(f.epss ? { epss: f.epss.value, 'epss-origin': f.epss.origin } : {}),
        ...(f.kev ? { kev: true } : {})
      }
    };
  });

  // Cloud findings (include_cloud): rules and results of their own, no file (a logical location with the resource and region),
  // properties.sources ['aws-readonly']. They are not part of the repository findings above.
  for (const f of d.cloud?.findings ?? []) {
    if (ruleIndex.has(f.id)) continue;
    ruleIndex.set(f.id, rules.length);
    rules.push({
      id: f.id,
      shortDescription: { text: f.title || f.id },
      help: { text: f.recommendation || 'See the finding message.' },
      defaultConfiguration: { level: LEVEL[f.severity] },
      properties: { tags: ['cloud', 'aws', 'end-of-life'], 'security-severity': DEFAULT_SECURITY_SEVERITY[f.severity] }
    });
  }
  const cloudResults = (d.cloud?.findings ?? []).map((f) => ({
    ruleId: f.id,
    ruleIndex: ruleIndex.get(f.id) ?? 0,
    level: LEVEL[f.severity],
    message: { text: `${f.title}${f.evidence ? ` (${f.evidence})` : ''}. ${f.recommendation}`.trim() },
    locations: [{ logicalLocations: [{ name: f.resource, fullyQualifiedName: `aws/${f.region}/${f.service}/${f.resource}`, kind: 'resource' }] }],
    properties: {
      sources: ['aws-readonly'],
      severity: f.severity,
      category: f.category,
      service: f.service,
      region: f.region,
      rankReason: f.rankReason
    }
  }));

  return {
    $schema: SARIF_SCHEMA,
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: TOOL_NAME, version: TOOL_VERSION, semanticVersion: TOOL_VERSION, rules } },
        invocations: [{ executionSuccessful: true, endTimeUtc: d.meta.generatedAt }],
        ...(d.meta.commitSha
          ? { versionControlProvenance: [{ repositoryUri: d.meta.repoUrl, revisionId: d.meta.commitSha, ...(d.meta.subfolder ? { mappedTo: { uriBaseId: 'SRCROOT', uri: d.meta.subfolder } } : {}) }] }
          : {}),
        results: [...results, ...measuredResults, ...cloudResults]
      }
    ]
  };
}

export function renderSarif(d: ReportData): string {
  return JSON.stringify(buildSarif(d), null, 2);
}
