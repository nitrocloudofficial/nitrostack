import { z } from 'zod';

/**
 * generated-project.schema.ts — W2 produces. FROZEN AT H0.
 * Output of stage ③ EMIT (deterministic template expansion).
 */
export const GeneratedProjectSchema = z.object({
  id: z.string(),
  rootPath: z.string(),
  files: z.array(
    z.object({
      relPath: z.string(),
      contents: z.string(),
    }),
  ),
  entrypoint: z.string(),
  toolNames: z.array(z.string()),
});
export type GeneratedProject = z.infer<typeof GeneratedProjectSchema>;
