import { Injectable } from '@nitrostack/core';
import type { EndpointGraph } from '../../contracts/endpoint-graph.schema.js';
import { ToolSurfaceIRSchema, countTools, type ToolSurfaceIR } from '../../contracts/ir.schema.js';
import type { PlanHints } from '../../contracts/ports.js';
import { PLANNER_SYSTEM_PROMPT, buildPlannerUserPrompt } from './prompts/planner.prompt.js';
import { ModelProviderFactory } from './providers/provider-factory.js';

/**
 * planner.service.ts — ② PLAN, stage 2 of the pipeline. THE ONLY LLM CALL
 * IN THE ENTIRE SYSTEM.
 *
 * Job, and only job: pick tool names, write descriptions, cluster endpoints
 * into tools, choose a widget archetype + field mapping per tool. It does
 * NOT write inputSchema (derived downstream from EndpointGraph by W2 via
 * `composes`) and it does NOT write code.
 *
 * Every response is Zod-validated against the frozen ToolSurfaceIRSchema
 * plus the graph-aware lint rules in validateAgainstGraph(). On failure we
 * retry with the validation errors fed back into the prompt, max 2 times.
 * If it still fails, we throw — we do not hand W2 a half-valid IR.
 *
 * PROVIDER-AGNOSTIC as of this revision: the actual model call is
 * delegated to a ModelProvider (providers/) chosen via ModelProviderFactory
 * (config: LLM_PROVIDER, default "anthropic"). Everything below this
 * comment — the retry loop, JSON parsing, Zod validation, graph
 * cross-reference lints — never changes based on which provider answered.
 * Only `anthropic` has been verified against a live endpoint; see
 * providers/groq-provider.ts's doc comment for the honest status of the
 * alternative.
 */

export class PlannerValidationError extends Error {
  constructor(message: string, public readonly issues: string[]) {
    super(message);
    this.name = 'PlannerValidationError';
  }
}

const MAX_RETRIES = 2;

@Injectable({ deps: [ModelProviderFactory] })
export class PlannerService {
  constructor(private readonly providerFactory: ModelProviderFactory) {}

  async plan(graph: EndpointGraph, hints?: PlanHints): Promise<ToolSurfaceIR> {
    const maxTools = hints?.maxTools ?? 20;
    let lastIssues: string[] = [];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const raw = await this.callModel(graph, hints, lastIssues, attempt);
      const parsed = this.tryParseJson(raw);
      if (!parsed.ok) {
        lastIssues = [`Response was not valid JSON: ${parsed.error}`];
        continue;
      }

      const zodResult = ToolSurfaceIRSchema.safeParse(parsed.value);
      if (!zodResult.success) {
        lastIssues = zodResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
        continue;
      }

      const graphIssues = this.validateAgainstGraph(zodResult.data, graph, maxTools);
      if (graphIssues.length > 0) {
        lastIssues = graphIssues;
        continue;
      }

      return zodResult.data;
    }

    throw new PlannerValidationError(
      `Planner failed to produce a valid IR after ${MAX_RETRIES + 1} attempts`,
      lastIssues,
    );
  }

  // ---------------------------------------------------------------------
  // Graph-aware lint rules — the checks Zod alone can't express because
  // they need to cross-reference the EndpointGraph.
  // ---------------------------------------------------------------------

  private validateAgainstGraph(ir: ToolSurfaceIR, graph: EndpointGraph, maxTools: number): string[] {
    const issues: string[] = [];
    const validIds = new Set(graph.endpoints.map((e) => e.id));

    const total = countTools(ir);
    if (total > maxTools) {
      issues.push(`Tool budget exceeded: ${total} tools, max is ${maxTools}. Cluster harder.`);
    }

    const seenNames = new Set<string>();
    for (const mod of ir.modules) {
      for (const tool of mod.tools) {
        if (seenNames.has(tool.name)) {
          issues.push(`Duplicate tool name "${tool.name}"`);
        }
        seenNames.add(tool.name);

        for (const endpointId of tool.composes) {
          if (!validIds.has(endpointId)) {
            issues.push(
              `Tool "${tool.name}" composes "${endpointId}" which does not exist in the EndpointGraph`,
            );
          }
        }
        if (!tool.composes.includes(tool.primaryEndpoint)) {
          issues.push(
            `Tool "${tool.name}" primaryEndpoint "${tool.primaryEndpoint}" is not one of its own composes entries`,
          );
        }
        if (!validIds.has(tool.primaryEndpoint)) {
          issues.push(`Tool "${tool.name}" primaryEndpoint "${tool.primaryEndpoint}" does not exist in the EndpointGraph`);
        }
      }
    }

    return issues;
  }

  // ---------------------------------------------------------------------
  // Model call
  // ---------------------------------------------------------------------

  private async callModel(
    graph: EndpointGraph,
    hints: PlanHints | undefined,
    priorIssues: string[],
    attempt: number,
  ): Promise<string> {
    const provider = this.providerFactory.get();
    const userPrompt = buildPlannerUserPrompt(graph, hints, priorIssues);

    try {
      return await provider.complete(PLANNER_SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Planner model call failed on attempt ${attempt + 1} (provider: ${provider.name}): ${message}`);
    }
  }

  private tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
    // Model is instructed to return only JSON, but strip code fences defensively.
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return { ok: true, value: JSON.parse(cleaned) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
