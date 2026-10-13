import { z } from 'zod';

/**
 * ir.schema.ts — W1 produces (via ② PLAN, the LLM), W2 consumes. FROZEN AT H1.
 *
 * This is THE contract of the whole project: the model emits data that
 * validates against this schema, never TypeScript. See architecture doc §4.
 *
 * IMPORTANT: there is deliberately NO `inputSchema` field anywhere in this
 * file. Input schemas are derived by the W2 emitter from the EndpointGraph
 * via each tool's `composes` array. The model cannot invent field names —
 * this is decision #3 in the architecture doc, made physical.
 */

export const AuthConfigSchema = z.object({
  type: z.enum(['apiKey', 'oauth2', 'none']),
  scheme: z.string().optional(),
  in: z.enum(['header', 'query', 'cookie']).optional(),
  name: z.string().optional(),
});
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export const WidgetBindingSchema = z.object({
  archetype: z.enum(['data-table', 'stat-card']),
  mapping: z.union([
    z.object({
      // data-table
      rowsPath: z.string(), // JSONPath into the response
      columns: z
        .array(z.object({ key: z.string(), label: z.string() }))
        .min(1)
        .max(8),
    }),
    z.object({
      // stat-card
      valuePath: z.string(),
      label: z.string(),
      unit: z.string().optional(),
    }),
  ]),
});
export type WidgetBinding = z.infer<typeof WidgetBindingSchema>;

export const ToolIRSchema = z.object({
  // lint: snake_case, verb-first, 3-40 chars
  name: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/, 'name must be snake_case, verb-first'),
  // lint: written for MODEL selection, not a docs site — 20-300 chars
  description: z.string().min(20).max(300),
  // lint: every entry MUST resolve to a real endpoint id in the graph — enforced
  // at validation time by validateIR(), not expressible in Zod alone since it
  // needs the graph for cross-reference.
  composes: z.array(z.string()).min(1),
  primaryEndpoint: z.string(),
  widget: WidgetBindingSchema.nullable(),
  cache: z.object({ ttl: z.number().positive() }).nullable(),
  requiresAuth: z.boolean(),
  examples: z
    .object({
      request: z.record(z.unknown()),
      response: z.unknown(),
    })
    .optional(),
});
export type ToolIR = z.infer<typeof ToolIRSchema>;

export const ToolModuleIRSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  tools: z.array(ToolIRSchema).min(1),
});
export type ToolModuleIR = z.infer<typeof ToolModuleIRSchema>;

function countTools(ir: { modules: { tools: unknown[] }[] }): number {
  return ir.modules.reduce((n, m) => n + m.tools.length, 0);
}

export const ToolSurfaceIRSchema = z
  .object({
    server: z.object({
      name: z.string(),
      version: z.string(),
      description: z.string(),
    }),
    auth: AuthConfigSchema,
    modules: z.array(ToolModuleIRSchema).min(1),
  })
  // lint: ≤ 20 tools total — hard fail, the model must cluster to fit
  .refine((ir) => countTools(ir) <= 20, {
    message: 'Tool budget exceeded (>20) — cluster harder',
  });
export type ToolSurfaceIR = z.infer<typeof ToolSurfaceIRSchema>;

export { countTools };
