import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ParserService, SpecParseError } from './parser.service.js';
import { EndpointGraphSchema } from '../../contracts/endpoint-graph.schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../../../fixtures');

function readFixture(rel: string): string {
  return readFileSync(path.join(FIXTURES, rel), 'utf-8');
}

describe('ParserService — demo.yaml snapshot', () => {
  const parser = new ParserService();

  it('produces the exact committed EndpointGraph fixture', async () => {
    const specText = readFixture('specs/demo.yaml');
    const graph = await parser.parseSpecBody(specText);

    const expected = JSON.parse(readFixture('graphs/demo.graph.json'));
    expect(graph).toEqual(expected);
  });

  it('output always validates against the frozen EndpointGraph contract', async () => {
    const specText = readFixture('specs/demo.yaml');
    const graph = await parser.parseSpecBody(specText);
    expect(EndpointGraphSchema.safeParse(graph).success).toBe(true);
  });

  it('extracts all six pinned endpoints with stable ids', async () => {
    const graph = await parser.parseSpecBody(readFixture('specs/demo.yaml'));
    expect(graph.endpoints.map((e) => e.id).sort()).toEqual(
      [
        'GET /v1/customers',
        'POST /v1/customers',
        'GET /v1/customers/{id}',
        'GET /v1/orders',
        'GET /v1/orders/{id}',
        'GET /v1/stats/revenue',
      ].sort(),
    );
  });

  it('resolves $ref and flattens response schemas without inventing fields', async () => {
    const graph = await parser.parseSpecBody(readFixture('specs/demo.yaml'));
    const listCustomers = graph.endpoints.find((e) => e.id === 'GET /v1/customers')!;
    expect(listCustomers.responseSchema).toEqual({
      type: 'object',
      properties: {
        customers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              created_at: { type: 'string', format: 'date-time' },
              lifetime_value: { type: 'number' },
            },
            required: ['id', 'name', 'email'],
          },
        },
        total: { type: 'integer' },
      },
      required: ['customers', 'total'],
    });
  });

  it('throws SpecParseError rather than guessing on a malformed spec (missing openapi version)', async () => {
    await expect(parser.parseSpecBody(JSON.stringify({ paths: {} }))).rejects.toThrow(SpecParseError);
  });

  it('throws SpecParseError on a path placeholder with no matching parameter', async () => {
    const badSpec = {
      openapi: '3.0.3',
      info: { title: 'Bad', version: '1.0' },
      paths: {
        '/v1/things/{id}': {
          get: { operationId: 'getThing', responses: { '200': { description: 'ok' } } },
        },
      },
    };
    await expect(parser.parseSpecBody(JSON.stringify(badSpec))).rejects.toThrow(SpecParseError);
  });

  it('throws SpecParseError on unresolvable local $ref rather than defaulting', async () => {
    const badSpec = {
      openapi: '3.0.3',
      info: { title: 'Bad', version: '1.0' },
      paths: {
        '/v1/things': {
          get: {
            operationId: 'listThings',
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/DoesNotExist' } },
                },
              },
            },
          },
        },
      },
    };
    await expect(parser.parseSpecBody(JSON.stringify(badSpec))).rejects.toThrow(SpecParseError);
  });

  it('throws SpecParseError on a circular $ref instead of infinite-looping', async () => {
    const badSpec = {
      openapi: '3.0.3',
      info: { title: 'Bad', version: '1.0' },
      components: {
        schemas: {
          A: { type: 'object', properties: { b: { $ref: '#/components/schemas/A' } } },
        },
      },
      paths: {
        '/v1/things': {
          get: {
            operationId: 'listThings',
            responses: {
              '200': {
                description: 'ok',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/A' } } },
              },
            },
          },
        },
      },
    };
    await expect(parser.parseSpecBody(JSON.stringify(badSpec))).rejects.toThrow(/depth|[Cc]ircular/);
  });
});
