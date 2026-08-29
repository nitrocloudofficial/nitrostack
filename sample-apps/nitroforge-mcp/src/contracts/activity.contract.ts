import { z } from 'zod';

/**
 * activity.contract.ts — W3 owns the interceptor + console that read this.
 * FROZEN AT H0. Shape is fixed verbatim from the project README so every
 * workstream's tool/resource/prompt calls end up console-observable without
 * coordination.
 */
export const ActivityEventSchema = z.object({
  ts: z.string(),
  kind: z.enum(['tool', 'resource', 'prompt', 'notification']),
  method: z.string(), // 'tools/call' · 'resources/read' · 'prompts/get'
  name: z.string(),
  durationMs: z.number().nullable(),
  status: z.enum(['ok', 'error']),
  detail: z.string().nullable(),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
