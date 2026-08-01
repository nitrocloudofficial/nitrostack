import { PromptDecorator as Prompt, Inject, type ExecutionContext } from '@nitrostack/core';
import { ARTIFACT_STORE, type ArtifactStore } from '../../contracts/store.contract.js';
import { ActivityService } from '../../observability/activity.service.js';

/**
 * catalog.prompts.ts — no class-level decorator (see catalog.resources.ts
 * for why). Handlers return a bare array of `{ role, content }` where
 * `content` is a plain string — confirmed from the real CLI-generated
 * calculator.prompts.ts, NOT the `{ messages: [{ content: { type: 'text',
 * text } }] }` shape the SDK reference doc's examples use.
 */
export class CatalogPrompts {
  constructor(
    @Inject(ARTIFACT_STORE) private readonly store: ArtifactStore,
    private readonly activity: ActivityService,
  ) {}

  private async logGet(name: string, start: number, status: 'ok' | 'error', detail: string | null) {
    await this.activity.record({
      ts: new Date().toISOString(),
      kind: 'prompt',
      method: 'prompts/get',
      name,
      durationMs: Date.now() - start,
      status,
      detail,
    });
  }

  @Prompt({
    name: 'forge_this_api',
    description: 'Chains parse_spec -> plan_tool_surface -> forge_server into one user action',
    arguments: [
      { name: 'spec', description: 'OpenAPI spec URL, or a name from forge://specs', required: true },
    ],
  })
  async forgeThisApi(args: any, _ctx: ExecutionContext) {
    const start = Date.now();
    await this.logGet('forge_this_api', start, 'ok', args?.spec ?? null);
    return [
      {
        role: 'user' as const,
        content: `Forge an MCP server for: ${args.spec}`,
      },
      {
        role: 'assistant' as const,
        content: [
          '1. Call parse_spec with this spec to get a graphId.',
          '2. Call plan_tool_surface with that graphId to get an irId.',
          '3. Call forge_server with that irId AND graphId to get a verified server.',
          '',
          'When done, summarize the compression ratio (endpoints vs. tools) and report the verification status.',
        ].join('\n'),
      },
    ];
  }

  @Prompt({
    name: 'review_tool_surface',
    description: 'Loads a planned IR and asks the model to critique its clustering, naming, and descriptions',
    arguments: [{ name: 'irId', description: 'IR id to review', required: true }],
  })
  async reviewToolSurface(args: any, _ctx: ExecutionContext) {
    const start = Date.now();
    const ir = await this.store.getIR(args.irId);

    if (!ir) {
      await this.logGet('review_tool_surface', start, 'error', `unknown irId: ${args.irId}`);
      return [
        {
          role: 'user' as const,
          content: `No IR found for id ${args.irId}.`,
        },
      ];
    }

    await this.logGet('review_tool_surface', start, 'ok', ir.server.name);
    return [
      {
        role: 'user' as const,
        content: [
          `Critique this tool surface (id: ${args.irId}):`,
          '',
          '```json',
          JSON.stringify(ir, null, 2),
          '```',
          '',
          'Assess: is the clustering sensible? Are names snake_case and verb-first? Are descriptions written for model tool-selection, not humans? Would any tool names confuse an agent choosing between them?',
        ].join('\n'),
      },
    ];
  }
}
