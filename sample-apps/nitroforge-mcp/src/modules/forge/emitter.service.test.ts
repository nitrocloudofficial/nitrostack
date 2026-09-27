import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { EmitterService } from './emitter.service.js';
import type { EndpointGraph } from '../../contracts/endpoint-graph.schema.js';
import type { ToolSurfaceIR } from '../../contracts/ir.schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../../../fixtures');

function readFixtureJSON<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES, rel), 'utf-8')) as T;
}

describe('EmitterService — determinism (BUILD-W2 rule 1: same IR in, byte-identical code out)', () => {
  let graph: EndpointGraph;
  let ir: ToolSurfaceIR;
  let emitter: EmitterService;

  beforeAll(() => {
    graph = readFixtureJSON<EndpointGraph>('graphs/demo.graph.json');
    ir = readFixtureJSON<ToolSurfaceIR>('irs/demo.ir.json');
    emitter = new EmitterService();
  });

  it('emits the expected files for the hand-written demo IR', async () => {
    const project = await emitter.emit(ir, graph);

    expect(project.toolNames.sort()).toEqual(
      [
        'search_customers',
        'get_customer',
        'create_customer',
        'list_orders',
        'get_order',
        'get_revenue_stats',
      ].sort(),
    );

    const relPaths = project.files.map((f) => f.relPath).sort();
    expect(relPaths).toEqual(
      [
        'src/app.module.ts',
        'src/index.ts',
        'src/modules/customers/customers.tools.ts',
        'src/modules/customers/customers.service.ts',
        'src/modules/customers/customers.module.ts',
        'src/modules/orders/orders.tools.ts',
        'src/modules/orders/orders.service.ts',
        'src/modules/orders/orders.module.ts',
        'src/modules/stats/stats.tools.ts',
        'src/modules/stats/stats.service.ts',
        'src/modules/stats/stats.module.ts',
        'package.json',
      ].sort(),
    );

    rmSync(project.rootPath, { recursive: true, force: true });
  }, 120000);

  it('produces byte-identical output on a second run against the same IR', async () => {
    const first = await emitter.emit(ir, graph);
    const second = await emitter.emit(ir, graph);

    const normalize = (files: typeof first.files) =>
      files
        .map((f) => ({ relPath: f.relPath, contents: f.contents }))
        .sort((a, b) => a.relPath.localeCompare(b.relPath));

    expect(normalize(second.files)).toEqual(normalize(first.files));
    expect(second.toolNames).toEqual(first.toolNames);

    rmSync(first.rootPath, { recursive: true, force: true });
    rmSync(second.rootPath, { recursive: true, force: true });
  }, 240000);

  it('derives input schemas only from the graph — never invents a field not present in pathParams/queryParams/bodySchema', async () => {
    const project = await emitter.emit(ir, graph);
    const customersTools = project.files.find((f) => f.relPath.endsWith('customers.tools.ts'));
    expect(customersTools).toBeDefined();

    // search_customers composes GET /v1/customers, whose queryParams are
    // exactly `query` and `limit` — the schema must contain only those,
    // not e.g. a hallucinated `page` or `sort` field.
    expect(customersTools!.contents).toContain('query: z.string().optional()');
    expect(customersTools!.contents).toContain('limit: z.number().optional()');
    expect(customersTools!.contents).not.toContain('page:');
    expect(customersTools!.contents).not.toContain('sort:');

    rmSync(project.rootPath, { recursive: true, force: true });
  }, 120000);
});
