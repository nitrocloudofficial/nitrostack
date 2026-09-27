import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ConfigService } from '@nitrostack/core';
import { PlannerService, PlannerValidationError } from './planner.service.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { GroqProvider } from './providers/groq-provider.js';
import { ModelProviderFactory } from './providers/provider-factory.js';
import type { EndpointGraph } from '../../contracts/endpoint-graph.schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../../../fixtures');

function loadGraph(): EndpointGraph {
  return JSON.parse(readFileSync(path.join(FIXTURES, 'graphs/demo.graph.json'), 'utf-8'));
}
function loadGoodIR(): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES, 'irs/demo.ir.json'), 'utf-8'));
}

function anthropicResponse(jsonBody: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: 'text', text: JSON.stringify(jsonBody) }] }),
    text: async () => '',
  };
}

function anthropicRawTextResponse(rawText: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: 'text', text: rawText }] }),
    text: async () => '',
  };
}

function makeConfig(): ConfigService {
  const cfg = new ConfigService();
  vi.spyOn(cfg, 'get').mockImplementation((key: string) =>
    key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined,
  );
  return cfg;
}

// PlannerService is provider-agnostic as of the ModelProviderFactory
// refactor -- tests still mock global fetch, which AnthropicProvider
// itself calls internally, so this wiring is transparent to every
// existing assertion below.
function makePlanner(cfg: ConfigService = makeConfig()): PlannerService {
  const anthropic = new AnthropicProvider(cfg);
  const groq = new GroqProvider(cfg);
  const factory = new ModelProviderFactory(cfg, anthropic, groq);
  return new PlannerService(factory);
}

describe('PlannerService', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch') as unknown as ReturnType<typeof vi.spyOn>;
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('accepts a valid model response on the first attempt', async () => {
    const goodIR = loadGoodIR();
    fetchSpy.mockResolvedValueOnce(anthropicResponse(goodIR) as any);

    const planner = makePlanner();
    const result = await planner.plan(loadGraph());

    expect(result.modules.length).toBe(3);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries with validation feedback when the model references an unknown endpoint, then succeeds', async () => {
    const goodIR = loadGoodIR() as any;
    const badIR = JSON.parse(JSON.stringify(goodIR));
    badIR.modules[0].tools[0].composes = ['GET /v1/does-not-exist'];

    fetchSpy
      .mockResolvedValueOnce(anthropicResponse(badIR) as any)
      .mockResolvedValueOnce(anthropicResponse(goodIR) as any);

    const planner = makePlanner();
    const result = await planner.plan(loadGraph());

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // second call's prompt should carry the validation issue forward
    const secondCallBody = JSON.parse((fetchSpy.mock.calls[1][1] as any).body);
    expect(secondCallBody.messages[0].content).toMatch(/does-not-exist/);
    expect(result.modules.length).toBe(3);
  });

  it('throws PlannerValidationError after exceeding max retries with a persistently invalid IR', async () => {
    const badIR = { server: {}, auth: {}, modules: [] }; // fails Zod outright

    fetchSpy.mockResolvedValue(anthropicResponse(badIR) as any);

    const planner = makePlanner();
    await expect(planner.plan(loadGraph())).rejects.toThrow(PlannerValidationError);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('retries when the model produces duplicate tool names across modules', async () => {
    const graph = loadGraph();
    const goodIR = loadGoodIR() as any;
    const duplicateNameIR = JSON.parse(JSON.stringify(goodIR));
    // Force a collision: give the first tool in module 2 the same name as
    // the first tool in module 1.
    duplicateNameIR.modules[1].tools[0].name = duplicateNameIR.modules[0].tools[0].name;

    fetchSpy
      .mockResolvedValueOnce(anthropicResponse(duplicateNameIR) as any)
      .mockResolvedValueOnce(anthropicResponse(goodIR) as any);

    const planner = makePlanner();
    const result = await planner.plan(graph);

    const secondCallBody = JSON.parse((fetchSpy.mock.calls[1][1] as any).body);
    expect(secondCallBody.messages[0].content).toMatch(/Duplicate tool name/);
    expect(result.modules.length).toBe(3);
  });

  it('retries when primaryEndpoint is not one of the tool\'s own composes entries', async () => {
    const graph = loadGraph();
    const goodIR = loadGoodIR() as any;
    const badPrimaryIR = JSON.parse(JSON.stringify(goodIR));
    // primaryEndpoint pointing at a real endpoint id, but one this tool
    // never actually composes -- a real, plausible model mistake (e.g.
    // picking the "obvious" endpoint instead of the one it declared).
    const otherToolEndpoint = graph.endpoints.find(
      (e: any) => !badPrimaryIR.modules[0].tools[0].composes.includes(e.id),
    );
    badPrimaryIR.modules[0].tools[0].primaryEndpoint = otherToolEndpoint.id;

    fetchSpy
      .mockResolvedValueOnce(anthropicResponse(badPrimaryIR) as any)
      .mockResolvedValueOnce(anthropicResponse(goodIR) as any);

    const planner = makePlanner();
    const result = await planner.plan(graph);

    const secondCallBody = JSON.parse((fetchSpy.mock.calls[1][1] as any).body);
    expect(secondCallBody.messages[0].content).toMatch(/is not one of its own composes entries/);
    expect(result.modules.length).toBe(3);
  });

  it('rejects an IR that exceeds the 20-tool budget even if individually valid', async () => {
    const graph = loadGraph();
    const tooManyTools = {
      server: { name: 'x', version: '1.0.0', description: 'x' },
      auth: { type: 'none' },
      modules: [
        {
          name: 'bloat',
          tools: Array.from({ length: 21 }, (_, i) => ({
            name: `get_thing_${i}`,
            description: 'A description that is definitely long enough to pass validation.',
            composes: [graph.endpoints[0].id],
            primaryEndpoint: graph.endpoints[0].id,
            widget: null,
            cache: null,
            requiresAuth: false,
          })),
        },
      ],
    };
    fetchSpy.mockResolvedValue(anthropicResponse(tooManyTools) as any);

    const planner = makePlanner();
    await expect(planner.plan(graph)).rejects.toThrow(PlannerValidationError);
  });

  it('throws immediately (before calling fetch) if ANTHROPIC_API_KEY is not configured', async () => {
    const cfg = new ConfigService();
    vi.spyOn(cfg, 'get').mockReturnValue(undefined);
    const planner = makePlanner(cfg);

    await expect(planner.plan(loadGraph())).rejects.toThrow(/ANTHROPIC_API_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handles non-JSON model output by retrying rather than crashing', async () => {
    const goodIR = loadGoodIR();
    fetchSpy
      .mockResolvedValueOnce(anthropicRawTextResponse('Sure, here is my plan: not json at all') as any)
      .mockResolvedValueOnce(anthropicResponse(goodIR) as any);

    const planner = makePlanner();
    const result = await planner.plan(loadGraph());
    expect(result.modules.length).toBe(3);
  });
});
