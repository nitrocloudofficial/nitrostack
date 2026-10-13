import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exportReconstructedSpec, generateAuthzTestSuite } from '../src/engine/artifacts.js';
import { runDetection } from '../src/engine/index.js';
import { parseOpenApiTemplates, diffSpec } from '../src/engine/spec.js';
import { aggregateEndpoints } from '../src/engine/topology.js';
import type { AccessLogRecord, EndpointTemplate, Finding } from '../src/engine/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function rec(overrides: Partial<AccessLogRecord>): AccessLogRecord {
  return {
    id: 'L1',
    ts: '2026-01-01T00:00:00.000Z',
    method: 'GET',
    path: '/api/v1/orders/1001',
    query: null,
    status: 200,
    actor: { sub: 'usr_1', role: 'user' },
    ip: '1.2.3.4',
    latencyMs: 10,
    respBytes: 100,
    ua: 'test',
    ...overrides,
  };
}

const SAMPLE_FINDING: Finding = {
  id: 'r1_cross_actor_abc123def456',
  rule: 'R1_CROSS_ACTOR',
  cwe: 'CWE-639',
  cweTitle: 'Authorization Bypass Through User-Controlled Key',
  template: '/api/v1/orders/{orderId}',
  methods: ['GET'],
  severity: 'CRITICAL',
  score: 100,
  title: 'test finding',
  rationale: 'test rationale',
  evidence: ['L1', 'L2'],
  evidenceUri: 'evidence://finding/r1_cross_actor_abc123def456',
  metrics: {},
  documented: true,
};

describe('exportReconstructedSpec', () => {
  it('infers integer schema for numeric params and uuid format for UUID-shaped params', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/api/v1/orders/1001' }),
      rec({ id: 'L2', path: '/api/v1/widgets/550e8400-e29b-41d4-a716-446655440000' }),
    ];
    const templates: EndpointTemplate[] = aggregateEndpoints(records, []);
    const spec = exportReconstructedSpec(templates, [], records) as { paths: Record<string, any> };

    const orderParam = spec.paths['/api/v1/orders/{orderId}'].get.parameters[0];
    expect(orderParam.schema).toEqual({ type: 'integer' });

    const widgetTemplate = Object.keys(spec.paths).find((p) => p.startsWith('/api/v1/widgets/'))!;
    const widgetParam = spec.paths[widgetTemplate].get.parameters[0];
    expect(widgetParam.schema).toEqual({ type: 'string', format: 'uuid' });
  });

  it('enumerates responses from observed statusCounts and attaches x-domainexpansion', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/api/v1/orders/1001', status: 200 }),
      rec({ id: 'L2', path: '/api/v1/orders/1002', status: 403 }),
    ];
    const templates = aggregateEndpoints(records, []);
    const spec = exportReconstructedSpec(templates, [SAMPLE_FINDING], records) as { paths: Record<string, any> };
    const op = spec.paths['/api/v1/orders/{orderId}'].get;
    expect(Object.keys(op.responses).sort()).toEqual(['200', '403']);
    expect(op['x-domainexpansion'].findingIds).toContain(SAMPLE_FINDING.id);
    expect(op['x-domainexpansion'].evidenceUris).toContain(SAMPLE_FINDING.evidenceUri);
    expect(op['x-domainexpansion'].observedRequestCount).toBe(2);
  });

  it('produces deterministic path and method key ordering', () => {
    const records: AccessLogRecord[] = [
      rec({ id: 'L1', path: '/api/v1/zebra/1' }),
      rec({ id: 'L2', path: '/api/v1/alpha/1' }),
      rec({ id: 'L3', path: '/api/v1/alpha/1', method: 'DELETE', status: 204 }),
    ];
    const templates = aggregateEndpoints(records, []);
    const spec = exportReconstructedSpec(templates, [], records) as { paths: Record<string, any> };
    expect(Object.keys(spec.paths)).toEqual(['/api/v1/alpha/{id}', '/api/v1/zebra/{id}']);
    expect(Object.keys(spec.paths['/api/v1/alpha/{id}'])).toEqual(['delete', 'get']);
  });

  it('is deterministic across repeated calls (snapshot on real fixture data)', () => {
    const raw = readFileSync(join(ROOT, 'fixtures/logs/acme-prod.jsonl'), 'utf-8');
    const records = raw.trim().split('\n').map((l) => JSON.parse(l) as AccessLogRecord);
    const rawSpecPaths = parseOpenApiTemplates(JSON.parse(readFileSync(join(ROOT, 'fixtures/spec/acme-openapi.json'), 'utf-8')));
    const naive = aggregateEndpoints(records, []);
    const diff = diffSpec(naive, rawSpecPaths);
    const documentedTemplates = diff.documented.map((t) => t.template);
    const { findings, templates } = runDetection(records, documentedTemplates);

    const specA = exportReconstructedSpec(templates, findings, records);
    const specB = exportReconstructedSpec(templates, findings, records);
    expect(specA).toEqual(specB);
    expect(specA).toMatchSnapshot();
  });
});

describe('generateAuthzTestSuite', () => {
  it('generates a jest file with the expected describe/it structure and header metadata', () => {
    const { filename, source } = generateAuthzTestSuite(SAMPLE_FINDING, 'jest');
    expect(filename).toMatch(/\.test\.ts$/);
    expect(source).toContain(SAMPLE_FINDING.id);
    expect(source).toContain(SAMPLE_FINDING.cwe);
    expect(source).toContain(SAMPLE_FINDING.evidenceUri);
    expect(source).toMatch(/describe\(/);
    expect(source).toMatch(/it\(/);
    expect(source).toMatch(/expect\(/);
  });

  it('jest output contains no placeholder credential values and parses as valid TypeScript', () => {
    const { source } = generateAuthzTestSuite(SAMPLE_FINDING, 'jest');
    expect(source).not.toMatch(/bearer\s+[a-z0-9]{10,}/i);
    expect(source).not.toMatch(/sk_live|sk-live|sk_test/i);
    expect(source).toMatch(/process\.env\./);

    const result = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext } });
    expect(result.diagnostics ?? []).toEqual([]);
  });

  it('never targets a host other than a TODO placeholder', () => {
    const { source } = generateAuthzTestSuite(SAMPLE_FINDING, 'jest');
    expect(source).toMatch(/TODO/);
    expect(source).not.toMatch(/https?:\/\/(?!TODO)[a-z0-9.-]+\.(com|net|org|io)/i);
  });

  it('generates a pytest file with a test function and header metadata', () => {
    const { filename, source } = generateAuthzTestSuite(SAMPLE_FINDING, 'pytest');
    expect(filename).toMatch(/^test_authz_.*\.py$/);
    expect(source).toContain(SAMPLE_FINDING.id);
    expect(source).toContain(SAMPLE_FINDING.cwe);
    expect(source).toMatch(/def test_/);
    expect(source).not.toMatch(/bearer\s+[a-z0-9]{10,}/i);
  });
});
