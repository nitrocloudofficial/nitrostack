import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  Inject,
  Widget,
  UseInterceptors,
  z,
} from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { EmitterService } from './emitter.service.js';
import { VerifierService } from './verifier.service.js';
import { ARTIFACT_STORE, type ArtifactStore } from '../../contracts/store.contract.js';
import { ActivityInterceptor } from '../../observability/activity.interceptor.js';

/**
 * forge.tools.ts — the MCP tool surface for W2. Thin wrapper only: emission
 * lives in EmitterService, verification in VerifierService, persistence
 * through ArtifactStore.
 *
 * CONTRACT NOTE — flagged, not silently worked around: BUILD-W2's stub spec
 * gives forge_server inputSchema `{ irId }` alone. But EmitPort.emit(ir,
 * graph) needs an EndpointGraph too, and store.contract.ts's putIR/getIR
 * don't track a graphId alongside the IR — there's no way to recover "the
 * graph this IR came from" from irId alone. plan_tool_surface already
 * requires an explicit graphId input for the same reason (it can't derive
 * "the" graph either), so forge_server follows the same pattern here:
 * inputSchema is `{ irId, graphId }`, not `{ irId }`. The calling agent
 * already has both ids in its own conversation context (parse_spec returned
 * graphId, plan_tool_surface returned irId), so this doesn't add real
 * friction — it just makes explicit what was implicitly required.
 *
 * @Controller() kept even though the real CLI-generated calculator sample
 * omits it entirely on its tool classes (verified — see
 * templates/skeleton provenance notes). Keeping it because it's what W1's
 * own tested ingest.tools.ts uses, and mixing conventions within one
 * codebase is worse than one redundant decorator.
 */

const ForgeServerInput = z.object({
  irId: z.string().describe('IR id returned by plan_tool_surface'),
  graphId: z
    .string()
    .describe('EndpointGraph id returned by parse_spec — the graph this IR was planned from'),
});

@Controller()
export class ForgeTools {
  constructor(
    private readonly emitter: EmitterService,
    private readonly verifier: VerifierService,
    @Inject(ARTIFACT_STORE) private readonly store: ArtifactStore,
  ) {}

  @Tool({
    name: 'forge_server',
    title: 'Forge MCP server',
    description:
      'Emit and verify a deployable NitroStack MCP server from a planned tool surface: deterministic codegen (no model), then typecheck, build, boot, and replay every tool against its example. Returns a verification report.',
    inputSchema: ForgeServerInput,
    taskSupport: 'required',
    invocation: {
      invoking: 'Forging MCP server...',
      invoked: 'Server forged',
    },
    examples: {
      request: { irId: 'ir_7a1b2c3d-...', graphId: 'graph_9f2c1e40-...' },
      response: {
        serverId: 'server_...',
        status: 'green',
        toolCount: 6,
        toolResults: [{ tool: 'search_customers', passed: true, diff: null }],
      },
    },
  })
  @Widget('tool-surface')
  // `as any`: TS strict constructor-parameter variance flags
  // ActivityInterceptor's typed `(activity: ActivityService)` constructor
  // as incompatible with InterceptorConstructor's `new (...args: unknown[])`
  // — a real TS variance quirk, not a real runtime mismatch (DIContainer
  // resolves the actual constructor dependency correctly regardless).
  @UseInterceptors(ActivityInterceptor as any)
  async forgeServer(input: z.infer<typeof ForgeServerInput>, ctx: ExecutionContext) {
    const task = ctx.task;

    task?.updateProgress('Reading tool surface plan...');
    const ir = await this.store.getIR(input.irId);
    if (!ir) {
      throw new Error(`No ToolSurfaceIR found for irId "${input.irId}" — call plan_tool_surface first`);
    }
    const graph = await this.store.getGraph(input.graphId);
    if (!graph) {
      throw new Error(`No EndpointGraph found for graphId "${input.graphId}" — call parse_spec first`);
    }
    task?.throwIfCancelled();

    const toolCount = ir.modules.reduce((n, m) => n + m.tools.length, 0);
    task?.updateProgress(`Emitting ${toolCount} tools across ${ir.modules.length} modules...`);
    const project = await this.emitter.emit(ir, graph);
    task?.throwIfCancelled();

    task?.updateProgress('Type-checking generated project...');
    task?.updateProgress('Building generated project...');
    task?.updateProgress('Booting server and completing MCP handshake...');
    task?.updateProgress(`Replaying ${project.toolNames.length} tools against expected responses...`);
    const report = await this.verifier.verifyWithContext(project, ir, graph);
    task?.throwIfCancelled();

    const serverId = await this.store.putServer({ project, report, irId: input.irId });

    return {
      serverId,
      status: report.status,
      toolCount: project.toolNames.length,
      toolResults: report.toolResults,
      stages: report.stages,
    };
  }
}
