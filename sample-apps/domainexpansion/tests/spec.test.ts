import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseOpenApiTemplates, diffSpec } from '../src/engine/spec.js';
import { aggregateEndpoints } from '../src/engine/topology.js';
import type { AccessLogRecord } from '../src/engine/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function loadFixtureRecords(): AccessLogRecord[] {
  const raw = readFileSync(join(ROOT, 'fixtures/logs/acme-prod.jsonl'), 'utf-8');
  return raw
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as AccessLogRecord);
}

describe('parseOpenApiTemplates', () => {
  it('extracts path keys from an OpenAPI 3.x document', () => {
    const spec = {
      openapi: '3.0.0',
      paths: {
        '/a': { get: {} },
        '/b/{id}': { get: {} },
      },
    };
    expect(parseOpenApiTemplates(spec).sort()).toEqual(['/a', '/b/{id}']);
  });

  it('extracts path keys from an OpenAPI 2.0 (Swagger) document the same way', () => {
    const spec = {
      swagger: '2.0',
      basePath: '/v1',
      paths: {
        '/pets': { get: {} },
        '/pets/{petId}': { get: {} },
      },
      definitions: { Pet: { $ref: '#/definitions/PetBase' } },
    };
    expect(parseOpenApiTemplates(spec).sort()).toEqual(['/pets', '/pets/{petId}']);
  });

  it('tolerates $ref-heavy documents without attempting to resolve them', () => {
    const spec = {
      paths: {
        '/widgets/{id}': { get: { responses: { '200': { $ref: '#/components/responses/Widget' } } } },
      },
    };
    expect(parseOpenApiTemplates(spec)).toEqual(['/widgets/{id}']);
  });

  it('returns an empty array for malformed input rather than throwing', () => {
    expect(parseOpenApiTemplates(null)).toEqual([]);
    expect(parseOpenApiTemplates('not an object')).toEqual([]);
    expect(parseOpenApiTemplates({})).toEqual([]);
  });

  it('reads the fixture spec\'s 27 documented paths', () => {
    const spec = JSON.parse(readFileSync(join(ROOT, 'fixtures/spec/acme-openapi.json'), 'utf-8'));
    expect(parseOpenApiTemplates(spec).length).toBe(27);
  });
});

describe('diffSpec', () => {
  it('matches on parameter position + static segments, never on parameter name', () => {
    const observed = aggregateEndpoints(
      [
        { id: 'L1', ts: '2026-01-01T00:00:00.000Z', method: 'GET', path: '/api/v1/orders/1001', query: null, status: 200, actor: { sub: 'usr_1', role: 'user' }, ip: '1.2.3.4', latencyMs: 10, respBytes: 100, ua: 'test' },
      ],
      [],
    );
    // spec names the param "order_id", we name it "orderId" — must still match.
    const result = diffSpec(observed, ['/api/v1/orders/{order_id}']);
    expect(result.documented.map((e) => e.template)).toEqual(['/api/v1/orders/{orderId}']);
    expect(result.shadow).toEqual([]);
    expect(result.orphanedInSpec).toEqual([]);
  });

  it('reports orphanedInSpec for documented paths never observed in traffic', () => {
    const observed = aggregateEndpoints([], []);
    const result = diffSpec(observed, ['/api/v1/never/{called}']);
    expect(result.orphanedInSpec).toEqual(['/api/v1/never/{called}']);
  });

  it('classifies against real fixture data: 34 observed, 27 documented, 7 shadow, export/customers is shadow', () => {
    const records = loadFixtureRecords();
    const spec = JSON.parse(readFileSync(join(ROOT, 'fixtures/spec/acme-openapi.json'), 'utf-8'));
    const rawSpecPaths = parseOpenApiTemplates(spec);

    const observed = aggregateEndpoints(records, []); // documented flag irrelevant pre-diff
    expect(observed.length).toBe(34);

    const result = diffSpec(observed, rawSpecPaths);
    expect(result.documented.length).toBe(27);
    expect(result.shadow.length).toBe(7);
    expect(result.shadow.map((e) => e.template)).toContain('/internal/v0/export/customers');
  });
});
