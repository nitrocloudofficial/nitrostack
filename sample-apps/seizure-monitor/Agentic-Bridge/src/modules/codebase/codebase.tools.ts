/**
 * Structural Cartographer tools.
 */
import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { CodebaseService } from './codebase.service.js';
import { WorkspaceService, describeSource } from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { TargetSchema } from '../../shared/schemas/index.js';
import type { KnowledgeFact } from '../../shared/schemas/index.js';

@Injectable({ deps: [CodebaseService, WorkspaceService, StoreService] })
export class CodebaseTools {
  constructor(
    private codebase: CodebaseService,
    private workspace: WorkspaceService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'map_file_dependencies',
    title: 'Map file dependencies',
    description:
      'Structural Cartographer. Parses a legacy codebase into a dependency graph using the ' +
      'TypeScript compiler API for JS/TS and per-language analysis elsewhere. Returns the ' +
      'architectural topography: layers, import edges, change-blast-radius hotspots, entry ' +
      'points and import cycles. Writes its findings into the shared knowledge base.',
    inputSchema: TargetSchema.extend({
      include_nodes: z
        .boolean()
        .default(false)
        .describe('Include the full per-file node list. Off by default to keep the payload small.'),
    }),
    examples: {
      request: { include_nodes: false },
      response: {
        target: 'fixtures/legacy-monolith',
        fileCount: 34,
        layers: { service: 3, 'data-access': 2, route: 2, middleware: 2, 'ui-component': 3 },
        hotspots: [{ path: 'server/db/aurora-orm.js', inbound: 3, layer: 'data-access' }],
      },
    },
  })
  @Widget('architecture-map')
  async mapFileDependencies(
    input: { target?: string; include_nodes?: boolean },
    ctx: ExecutionContext
  ) {
    // Remote targets are cloned here and deleted in the `finally`. Everything
    // between the two is identical to the local-path case.
    const handle = await this.workspace.acquireTarget(input.target);
    try {
      ctx.logger.info('Structural Cartographer traversing', {
        target: handle.label,
        remote: handle.remote,
      });

      const map = this.codebase.buildMap(handle.root);

      const facts: KnowledgeFact[] = [
        {
          id: 'arch:topography',
          agent: 'structural-cartographer',
          category: 'architecture',
          title: 'Architectural topography',
          detail: this.describeLayers(map.layers),
          evidence: Object.keys(map.layers),
          weight: 5,
        },
        {
          id: 'arch:tree',
          agent: 'structural-cartographer',
          category: 'architecture',
          title: 'Directory tree',
          detail: map.tree,
          evidence: [],
          weight: 4,
        },
        ...map.hotspots.slice(0, 5).map<KnowledgeFact>((h) => ({
          id: `arch:hotspot:${h.path}`,
          agent: 'structural-cartographer',
          category: 'architecture',
          title: `High-blast-radius file: ${h.path}`,
          detail:
            `${h.path} (${h.layer}) is imported by ${h.inbound} other file(s). ` +
            `Changing it requires reviewing every dependent.`,
          evidence: [h.path],
          weight: 4,
        })),
      ];

      if (map.cycles.length) {
        facts.push({
          id: 'arch:cycles',
          agent: 'structural-cartographer',
          category: 'architecture',
          title: 'Import cycles',
          detail: map.cycles.map((c) => c.join(' → ')).join('\n'),
          evidence: map.cycles.flat(),
          weight: 3,
        });
      }

      this.store.clearAgentFacts('structural-cartographer');
      this.store.addFacts(facts);

      const { nodes, ...summary } = map;
      // Report the target the caller recognises — the repo slug, not the temp
      // directory it happens to be sitting in for the next few milliseconds.
      const described = { ...summary, target: handle.label, source: describeSource(handle) };
      return input.include_nodes
        ? { ...described, nodes }
        : { ...described, nodeCount: nodes.length };
    } finally {
      await handle.cleanup();
    }
  }

  @Tool({
    name: 'find_change_surface',
    title: 'Find change surface',
    description:
      'Answers "if I modify X, what else must I touch?". Walks inbound dependency edges ' +
      'transitively from every file matching the query and reports the impacted set by depth. ' +
      'This is the query that makes the dependency graph worth building.',
    inputSchema: TargetSchema.extend({
      query: z
        .string()
        .min(2)
        .describe('Filename fragment, symbol or export to use as the seed, e.g. "aurora-orm" or "cache"'),
      max_depth: z.number().min(1).max(6).default(3).describe('How many hops of dependents to follow'),
    }),
    examples: {
      request: { query: 'aurora-orm', max_depth: 3 },
      response: {
        seeds: ['server/db/aurora-orm.js'],
        impacted: [{ path: 'server/services/invoice.service.js', depth: 1, layer: 'service', reason: 'imports server/db/aurora-orm.js' }],
      },
    },
  })
  async findChangeSurface(
    input: { target?: string; query: string; max_depth?: number },
    ctx: ExecutionContext
  ) {
    const handle = await this.workspace.acquireTarget(input.target);
    try {
      const map = this.codebase.buildMap(handle.root);
      const result = this.codebase.changeSurface(map, input.query, input.max_depth ?? 3);

      ctx.logger.info('Change surface computed', {
        query: input.query,
        seeds: result.seeds.length,
        impacted: result.impacted.length,
      });

      const source = describeSource(handle);

      if (!result.seeds.length) {
        return {
          ...result,
          source,
          note: `Nothing matched "${input.query}". Try a filename fragment such as "orm", "cache" or "invoice".`,
        };
      }

      return {
        ...result,
        source,
        summary:
          `Changing ${result.seeds.length} seed file(s) impacts ${result.impacted.length} ` +
          `dependent file(s) within ${input.max_depth ?? 3} hops.`,
      };
    } finally {
      await handle.cleanup();
    }
  }

  private describeLayers(layers: Record<string, number>): string {
    return Object.entries(layers)
      .sort((a, b) => b[1] - a[1])
      .map(([layer, count]) => `${layer}: ${count} file(s)`)
      .join(', ');
  }
}
