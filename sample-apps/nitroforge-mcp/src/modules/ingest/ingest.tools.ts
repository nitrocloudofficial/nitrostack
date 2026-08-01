import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  Inject,
  Cache,
  RateLimit,
  Widget,
  z,
} from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { ParserService } from './parser.service.js';
import { PlannerService } from './planner.service.js';
import { ARTIFACT_STORE, type ArtifactStore } from '../../contracts/store.contract.js';

/**
 * ingest.tools.ts — the MCP tool surface for W1. Thin wrappers only: all
 * logic lives in ParserService / PlannerService, all persistence goes
 * through ArtifactStore (W3's contract — see store.contract.ts).
 *
 * IMPORTANT re: @nitrostack/core exports — `Tool`, `Resource`, `Prompt` are
 * exported bare as their *builder classes* (tool.js/resource.js/prompt.js),
 * NOT the method decorators. The decorators are exported under the
 * `*Decorator` aliases (`ToolDecorator`, `ControllerDecorator`, etc). Using
 * the bare `Tool` class as `@Tool(...)` fails at runtime (invoking a class
 * without `new`). Verified directly against the installed package's
 * dist/core/index.d.ts — this contradicts the SDK Reference example and
 * confirms the Quick Start's `import { ToolDecorator as Tool }` is correct.
 */

const ParseSpecInput = z.object({
  spec: z.string().describe('OpenAPI spec URL or raw JSON/YAML body'),
});

const PlanToolSurfaceInput = z.object({
  graphId: z.string().describe('graphId returned by parse_spec'),
});

@Controller()
export class IngestTools {
  constructor(
    private readonly parser: ParserService,
    private readonly planner: PlannerService,
    @Inject(ARTIFACT_STORE) private readonly store: ArtifactStore,
  ) {}

  @Tool({
    name: 'parse_spec',
    title: 'Parse OpenAPI spec',
    description:
      'Deterministically parse an OpenAPI 3.x spec (URL or raw body) into an EndpointGraph. No model involvement — field names and shapes come from the spec or the call fails.',
    inputSchema: ParseSpecInput,
    invocation: {
      invoking: 'Parsing OpenAPI spec...',
      invoked: 'Spec parsed',
    },
    examples: {
      request: { spec: 'https://api.democrm.dev/openapi.yaml' },
      response: {
        graphId: 'graph_9f2c1e40-...',
        title: 'Demo CRM API',
        version: '1.0.0',
        endpointCount: 6,
        resourceGroups: ['customers', 'orders', 'stats'],
        authSchemes: ['ApiKeyAuth'],
      },
    },
  })
  @Cache({ ttl: 3600 })
  // NOTE: @Cache uses a shared store keyed by `ClassName:methodName:JSON(input)`,
  // NOT scoped per class instance. Correct in production (repeat calls with the
  // same spec URL/body should hit cache regardless of which request handled the
  // first one) but it means tests must call clearCache() between runs if they
  // reuse the same input across a fresh store/service instance — see
  // ingest.tools.test.ts.
  async parseSpec(input: z.infer<typeof ParseSpecInput>, _context: ExecutionContext) {
    const graph = await this.parser.parse(input.spec);
    const graphId = await this.store.putGraph(graph);

    const resourceGroups = [...new Set(graph.endpoints.flatMap((e) => e.tags))].sort();
    const authSchemes = Object.keys(graph.securitySchemes).sort();

    return {
      graphId,
      title: graph.source.title,
      version: graph.source.version,
      endpointCount: graph.endpoints.length,
      resourceGroups,
      authSchemes,
    };
  }

  @Tool({
    name: 'plan_tool_surface',
    title: 'Plan tool surface',
    description:
      'Cluster a parsed EndpointGraph into a small MCP tool surface (names, descriptions, widget mapping). The only LLM call in NitroForge. Validated against the graph before returning; throws rather than returning a partially-valid plan.',
    inputSchema: PlanToolSurfaceInput,
    invocation: {
      invoking: 'Clustering endpoints into tools...',
      invoked: 'Tool surface planned',
    },
    examples: {
      request: { graphId: 'graph_9f2c1e40-...' },
      response: {
        irId: 'ir_7a1b2c3d-...',
        serverName: 'demo-crm-mcp',
        toolCount: 6,
        endpointCount: 6,
        tools: [
          { name: 'search_customers', module: 'customers', description: 'Search customers by name or email...', widget: 'data-table' },
          { name: 'get_revenue_stats', module: 'stats', description: 'Get total revenue across all orders...', widget: 'stat-card' },
        ],
      },
    },
  })
  @RateLimit({ requests: 5, window: '1m', key: () => 'global' })
  @Widget('tool-surface')
  async planToolSurface(input: z.infer<typeof PlanToolSurfaceInput>, _context: ExecutionContext) {
    const graph = await this.store.getGraph(input.graphId);
    if (!graph) {
      throw new Error(`No EndpointGraph found for graphId "${input.graphId}" — call parse_spec first`);
    }

    const ir = await this.planner.plan(graph);
    const irId = await this.store.putIR(ir);

    const toolCount = ir.modules.reduce((n, m) => n + m.tools.length, 0);
    const tools = ir.modules.flatMap((mod) =>
      mod.tools.map((t) => ({
        name: t.name,
        module: mod.name,
        description: t.description,
        widget: t.widget?.archetype ?? null,
      })),
    );

    return {
      irId,
      serverName: ir.server.name,
      toolCount,
      endpointCount: graph.endpoints.length,
      tools,
    };
  }
}
