// CycloneDX 1.5 JSON export built from the direct dependency list (manifest and lockfile inventory).
// Versions are exactly as parsed; versions derived from a range are flagged with a property, never presented as exact.
import { createHash } from 'node:crypto';
import type { ReportData, ReportDependency } from './report-data.js';
import { TOOL_NAME, TOOL_VERSION } from './report-data.js';

const enc = encodeURIComponent;

// Package URL (purl spec). npm scopes are percent-encoded (%40scope); composer vendor/name are lowercase.
export function purlOf(dep: Pick<ReportDependency, 'ecosystem' | 'name' | 'version'>): string {
  const version = dep.version ? `@${enc(dep.version)}` : '';
  if (dep.ecosystem === 'npm') return `pkg:npm/${dep.name.split('/').map(enc).join('/')}${version}`;
  return `pkg:composer/${dep.name.toLowerCase().split('/').map(enc).join('/')}${version}`;
}

// Deterministic RFC 4122 layout (version 5) id derived from the content.
function uuidFrom(seed: string): string {
  const h = createHash('sha1').update(seed).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

function projectName(d: ReportData): string {
  const tail = d.meta.repoUrl.replace(/\/+$/, '').split('/').slice(-2).join('/') || 'project';
  return d.meta.subfolder ? `${tail}/${d.meta.subfolder}` : tail;
}

export function buildSbom(d: ReportData): Record<string, unknown> {
  const seen = new Set<string>();
  const components: Array<Record<string, unknown>> = [];
  for (const dep of d.dependencies) {
    if (!dep.name) continue;
    const purl = purlOf(dep);
    if (seen.has(purl)) continue;
    seen.add(purl);
    components.push({
      type: 'library',
      'bom-ref': purl,
      name: dep.name,
      ...(dep.version ? { version: dep.version } : {}),
      purl,
      scope: dep.dev ? 'optional' : 'required',
      properties: [
        { name: 'metamorph:ecosystem', value: dep.ecosystem },
        { name: 'metamorph:dev', value: String(dep.dev) },
        { name: 'metamorph:version-source', value: dep.approximate ? 'range (lowest allowed version, not a lockfile pin)' : 'exact' }
      ]
    });
  }
  const projectRef = 'metamorph-project';
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${uuidFrom(JSON.stringify([d.meta.repoUrl, d.meta.subfolder ?? '', d.meta.generatedAt, [...seen]]))}`,
    version: 1,
    metadata: {
      timestamp: d.meta.generatedAt,
      tools: { components: [{ type: 'application', name: TOOL_NAME, version: TOOL_VERSION }] },
      component: { type: 'application', 'bom-ref': projectRef, name: projectName(d), ...(d.meta.commit ? { version: d.meta.commit } : {}), ...(d.meta.commitSha ? { properties: [{ name: 'metamorph:commit-sha', value: d.meta.commitSha }] } : {}) }
    },
    components,
    dependencies: [{ ref: projectRef, dependsOn: components.map((c) => c['bom-ref'] as string) }]
  };
}

export function renderSbom(d: ReportData): string {
  return JSON.stringify(buildSbom(d), null, 2);
}
