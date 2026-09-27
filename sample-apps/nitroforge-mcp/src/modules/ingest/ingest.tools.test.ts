import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { ExecutionContext, Logger } from '@nitrostack/core';
import { clearCache } from '@nitrostack/core';
import { IngestTools } from './ingest.tools.js';
import { ParserService } from './parser.service.js';
import { PlannerService } from './planner.service.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { GroqProvider } from './providers/groq-provider.js';
import { ModelProviderFactory } from './providers/provider-factory.js';
import { InMemoryArtifactStore } from '../../testing/in-memory-artifact-store.js';
import { ConfigService } from '@nitrostack/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../../../fixtures');

function readFixture(rel: string): string {
  return readFileSync(path.join(FIXTURES, rel), 'utf-8');
}

const fakeLogger: Logger = { debug() {}, info() {}, warn() {}, error() {} };
const fakeContext: ExecutionContext = { requestId: 'test-req', logger: fakeLogger };

function anthropicResponse(jsonBody: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: 'text', text: JSON.stringify(jsonBody) }] }),
    text: async () => '',
  };
}

describe('IngestTools — parse_spec -> plan_tool_surface', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let tools: IngestTools;
  let store: InMemoryArtifactStore;

  beforeEach(() => {
    clearCache(); // @Cache uses a shared store keyed by class:method:input — reset between tests
    fetchSpy = vi.spyOn(globalThis, 'fetch') as unknown as ReturnType<typeof vi.spyOn>;
    const cfg = new ConfigService();
    vi.spyOn(cfg, 'get').mockImplementation((key: string) =>
      key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined,
    );
    store = new InMemoryArtifactStore();
    const providerFactory = new ModelProviderFactory(cfg, new AnthropicProvider(cfg), new GroqProvider(cfg));
    tools = new IngestTools(new ParserService(), new PlannerService(providerFactory), store);
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('parse_spec returns a compact summary, not the full graph, and stores the graph', async () => {
    const result = await tools.parseSpec({ spec: readFixture('specs/demo.yaml') }, fakeContext);

    expect(result).toMatchObject({
      title: 'Demo CRM API',
      version: '1.0.0',
      endpointCount: 6,
      authSchemes: ['ApiKeyAuth'],
    });
    expect(result.resourceGroups.sort()).toEqual(['customers', 'orders', 'stats']);
    expect(typeof result.graphId).toBe('string');
    expect(result).not.toHaveProperty('endpoints'); // must be a summary, not the raw graph

    const stored = await store.getGraph(result.graphId);
    expect(stored?.endpoints.length).toBe(6);
  });

  it('plan_tool_surface consumes a graphId from parse_spec and returns a tool summary', async () => {
    const goodIR = JSON.parse(readFixture('irs/demo.ir.json'));
    fetchSpy.mockResolvedValueOnce(anthropicResponse(goodIR) as any);

    const parsed = await tools.parseSpec({ spec: readFixture('specs/demo.yaml') }, fakeContext);
    const planned = await tools.planToolSurface({ graphId: parsed.graphId }, fakeContext);

    expect(planned.serverName).toBe('demo-crm-mcp');
    expect(planned.toolCount).toBe(6);
    expect(planned.endpointCount).toBe(6);
    expect(planned.tools.length).toBe(6);
    expect(planned.tools[0]).toHaveProperty('name');
    expect(planned.tools[0]).toHaveProperty('module');
    expect(planned.tools[0]).toHaveProperty('description');

    const storedIR = await store.getIR(planned.irId);
    expect(storedIR?.modules.length).toBe(3);
  });

  it('plan_tool_surface throws a clear error for an unknown graphId rather than calling the model', async () => {
    await expect(tools.planToolSurface({ graphId: 'graph_does_not_exist' }, fakeContext)).rejects.toThrow(
      /No EndpointGraph found/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
