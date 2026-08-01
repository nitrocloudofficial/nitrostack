import { describe, it, expect } from 'vitest';
import { detectR5Shadow } from '../src/engine/rules/r5-shadow.js';
import { aggregateEndpoints } from '../src/engine/topology.js';
import { templatisePaths } from '../src/engine/templatise.js';
import type { AccessLogRecord } from '../src/engine/types.js';

function rec(overrides: Partial<AccessLogRecord>): AccessLogRecord {
  return {
    id: 'L1',
    ts: '2026-01-01T00:00:00.000Z',
    method: 'GET',
    path: '/a',
    query: null,
    status: 200,
    actor: { sub: null, role: null },
    ip: '1.2.3.4',
    latencyMs: 10,
    respBytes: 100,
    ua: 'test',
    ...overrides,
  };
}

function buildContext(records: AccessLogRecord[], documented: string[] = []) {
  const templates = aggregateEndpoints(records, documented);
  const templateMap = templatisePaths(records.map((r) => r.path));
  const byTemplate = new Map<string, AccessLogRecord[]>();
  for (const r of records) {
    const t = templateMap.get(r.path);
    if (t === undefined) continue;
    if (!byTemplate.has(t)) byTemplate.set(t, []);
    byTemplate.get(t)!.push(r);
  }
  return { records, templates, documented, byTemplate };
}

describe('detectR5Shadow — API-shape pre-filter (no-spec heuristic mode)', () => {
  it('does not flag a one-off static asset (no params, recognisable extension)', () => {
    const records: AccessLogRecord[] = [
      // one API-ish endpoint with real volume, plus one-off static files
      ...Array.from({ length: 50 }, (_, i) => rec({ id: `A${i}`, path: '/api/v1/orders' })),
      rec({ id: 'S1', path: '/images/logo.gif' }),
      rec({ id: 'S2', path: '/about.html' }),
      rec({ id: 'S3', path: '/styles/main.css' }),
    ];
    const ctx = buildContext(records);
    const findings = detectR5Shadow(ctx);
    const flaggedTemplates = findings.map((f) => f.template);
    expect(flaggedTemplates).not.toContain('/images/logo.gif');
    expect(flaggedTemplates).not.toContain('/about.html');
    expect(flaggedTemplates).not.toContain('/styles/main.css');
  });

  it('still flags a low-traffic API-shaped endpoint under an internal/debug/legacy prefix', () => {
    const records: AccessLogRecord[] = [
      ...Array.from({ length: 50 }, (_, i) => rec({ id: `A${i}`, path: '/api/v1/orders' })),
      rec({ id: 'D1', path: '/internal/v1/metrics' }),
    ];
    const ctx = buildContext(records);
    const findings = detectR5Shadow(ctx);
    expect(findings.map((f) => f.template)).toContain('/internal/v1/metrics');
  });

  it('still flags a parameterised path even when its final segment has a static-looking extension', () => {
    const records: AccessLogRecord[] = [
      ...Array.from({ length: 50 }, (_, i) => rec({ id: `A${i}`, path: '/api/v1/orders' })),
      // a real API export endpoint that happens to end in ".csv"-style names per object id
      rec({ id: 'E1', path: '/internal/reports/1001.csv' }),
      rec({ id: 'E2', path: '/internal/reports/1002.csv' }),
      rec({ id: 'E3', path: '/internal/reports/1003.csv' }),
      rec({ id: 'E4', path: '/internal/reports/1004.csv' }),
      rec({ id: 'E5', path: '/internal/reports/1005.csv' }),
    ];
    const ctx = buildContext(records);
    const findings = detectR5Shadow(ctx);
    // templatised to /internal/reports/{id} (or similar) via templatise.ts's
    // numeric-collapse rule — it matches SHADOW_PREFIX regardless, so this
    // mainly confirms the static-asset filter's `hasParams` guard doesn't
    // wrongly exclude it.
    expect(findings.some((f) => f.template.startsWith('/internal/reports/'))).toBe(true);
  });

  it('computes the low-traffic percentile only over API-shaped candidates, not diluted by a long tail of static files', () => {
    // Many one-off static files plus one genuinely low-traffic API endpoint
    // with no internal/debug/legacy prefix — percentile should be computed
    // over API-shaped candidates only, so the API endpoint's low count is
    // correctly judged against other API endpoints, not swamped by 40
    // one-request static assets.
    const records: AccessLogRecord[] = [
      ...Array.from({ length: 40 }, (_, i) => rec({ id: `S${i}`, path: `/assets/file${i}.png` })),
      ...Array.from({ length: 100 }, (_, i) => rec({ id: `H${i}`, path: '/api/v1/health' })),
      rec({ id: 'Q1', path: '/api/v1/rarely-used' }),
    ];
    const ctx = buildContext(records);
    const findings = detectR5Shadow(ctx);
    const flagged = findings.map((f) => f.template);
    expect(flagged).toContain('/api/v1/rarely-used');
    expect(flagged.some((t) => t.startsWith('/assets/'))).toBe(false);
  });

  it('spec-provided mode is completely unaffected by the static-asset filter', () => {
    const records: AccessLogRecord[] = [rec({ id: 'S1', path: '/images/logo.gif' })];
    const ctx = buildContext(records, []); // no spec imported still, but verifies filter is heuristic-only
    // Re-run with a spec that documents nothing — spec-provided branch requires ctx.documented non-empty.
    const specCtx = { ...ctx, documented: ['/some/other/path'] };
    const findings = detectR5Shadow(specCtx);
    // In spec-provided mode, EVERY undocumented template is shadow — including static assets.
    expect(findings.map((f) => f.template)).toContain('/images/logo.gif');
  });
});
