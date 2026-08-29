import type { EndpointGraph } from '../../../contracts/endpoint-graph.schema.js';
import type { PlanHints } from '../../../contracts/ports.js';

/**
 * planner.prompt.ts — v1
 *
 * Versioned deliberately (per team brief: "keep the planner prompt in a
 * versioned file, not inline in a string literal"). Bump the version comment
 * whenever the instructions change so prompt regressions are diffable.
 */

export const PLANNER_PROMPT_VERSION = 'v2';
// v2: compacted the graph sent to the model to id/method/path/summary/tags/
// param-names only (was: the full EndpointGraph with schemas), per the
// adjusted workflow's Phase 2B instruction — full schemas blow context on
// real specs and the model never needs them (it doesn't author inputSchema).

export const PLANNER_SYSTEM_PROMPT = `You are the PLAN stage of NitroForge, a compiler that turns OpenAPI specs into MCP servers.

You receive a compacted view of the EndpointGraph (a structured, deterministic extraction of an OpenAPI spec) — just endpoint ids, methods, paths, summaries, tags, and parameter names, ALL FACTUAL and already resolved, ground truth. Full param/response schemas are withheld deliberately: you don't need them for clustering, and you never author inputSchema (that's derived downstream from the full graph, not from anything you see here).

Your ONLY job is judgment that has no single correct answer, derivable from the spec:
1. Cluster endpoints into a small number of tools (target: as few as sensibly possible, HARD MAX 20 total across all modules). Naive 1:1 endpoint-to-tool mapping is a failure mode, not a valid answer — group list/detail/create/update/delete on the same resource into one tool where it makes sense, and generally favor coarser tools with clear composes arrays over many narrow ones.
2. Name each tool snake_case, verb-first (e.g. "search_customers", not "customers_search").
3. Write each tool description FOR MODEL SELECTION — 20 to 300 characters, stating what it does and what it returns, not marketing copy. E.g. "Search customers by name, email, or creation date. Returns up to 100 matches." not "Customers endpoint."
4. Group tools into named modules (e.g. "customers", "orders").
5. Pick a widget archetype per tool if its response is naturally visual: "data-table" for list-shaped responses (with rowsPath + up to 8 columns), "stat-card" for single-metric responses (with valuePath + label). Use null if neither fits.
6. Set requiresAuth true if the underlying endpoint(s) have any non-empty "security" array.

What you must NEVER do:
- NEVER invent field names, types, or response shapes. You do not write inputSchema — it does not exist in your output at all, it is derived downstream from the EndpointGraph by a separate deterministic stage.
- NEVER emit endpoint ids that are not present in the EndpointGraph you were given.
- NEVER write code. Your entire output is one JSON object matching the schema below.

Output ONLY a single JSON object — no markdown fences, no prose before or after — matching exactly this shape:

{
  "server": { "name": string, "version": string, "description": string },
  "auth": { "type": "apiKey" | "oauth2" | "none", "scheme"?: string, "in"?: "header"|"query"|"cookie", "name"?: string },
  "modules": [
    {
      "name": string,               // snake_case module/resource grouping name
      "tools": [
        {
          "name": string,           // snake_case, verb-first, 3-40 chars
          "description": string,    // 20-300 chars, written for model selection
          "composes": string[],     // endpoint ids from the graph, min 1
          "primaryEndpoint": string,// must be one of composes
          "widget": null | {
            "archetype": "data-table",
            "mapping": { "rowsPath": string, "columns": [{ "key": string, "label": string }] }  // max 8 columns
          } | {
            "archetype": "stat-card",
            "mapping": { "valuePath": string, "label": string, "unit"?: string }
          },
          "cache": null | { "ttl": number },
          "requiresAuth": boolean
        }
      ]
    }
  ]
}`;

export function buildPlannerUserPrompt(
  graph: EndpointGraph,
  hints: PlanHints | undefined,
  priorIssues: string[],
): string {
  const parts: string[] = [];

  // Compacted on purpose: the model only needs enough to cluster and name
  // tools, not full param/response schemas — those would blow the context
  // window on real specs and the model has no legitimate use for them
  // (it never authors inputSchema; that's derived downstream from the
  // full EndpointGraph, which this compacted view is NOT a substitute for).
  const compactEndpoints = graph.endpoints.map((e) => ({
    id: e.id,
    method: e.method,
    path: e.path,
    summary: e.summary,
    tags: e.tags,
    pathParams: e.pathParams.map((p) => p.name),
    queryParams: e.queryParams.map((p) => p.name),
  }));

  parts.push(`API: "${graph.source.title}" (version ${graph.source.version}), ${compactEndpoints.length} endpoints:`);
  parts.push(JSON.stringify(compactEndpoints, null, 2));

  if (hints?.preferredModules?.length) {
    parts.push(`\nPreferred module grouping (a hint, not a hard requirement): ${hints.preferredModules.join(', ')}`);
  }
  if (hints?.maxTools) {
    parts.push(`\nTool budget for this run: ${hints.maxTools} (overrides the default 20 if lower).`);
  }

  if (priorIssues.length > 0) {
    parts.push(
      `\nYour previous attempt was REJECTED by validation. Fix ALL of the following issues and return a corrected JSON object (same format, nothing else):`,
    );
    parts.push(priorIssues.map((i) => `- ${i}`).join('\n'));
  }

  return parts.join('\n');
}
