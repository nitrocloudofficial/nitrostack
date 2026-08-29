import { z } from 'zod';

/**
 * verification-report.schema.ts — W2 produces, W3 renders. FROZEN AT H0.
 * Output of stage ④ VERIFY (tsc / boot / replay).
 *
 * Split out from generated-project.schema.ts to match the layout documented
 * in docs/README-team.md and referenced directly by docs/BUILD-W2.md
 * ("returning VerificationReport per src/contracts/verification-report.schema.ts").
 *
 * `repairAttempts` is optional and defaults to 0: BUILD-W2 explicitly cuts
 * the repair loop from scope ("Do not build: a repair loop (cut)"), so W2
 * shouldn't need to populate it, but the field stays in case that changes.
 */

export const StageResultSchema = z.object({
  passed: z.boolean(),
  durationMs: z.number().nonnegative(),
  log: z.string().optional(),
});
export type StageResult = z.infer<typeof StageResultSchema>;

export const VerificationReportSchema = z.object({
  status: z.enum(['green', 'amber', 'red']),
  stages: z.object({
    typecheck: StageResultSchema,
    build: StageResultSchema,
    boot: StageResultSchema,
    replay: StageResultSchema,
  }),
  toolResults: z.array(
    z.object({
      tool: z.string(),
      passed: z.boolean(),
      diff: z.string().nullable(),
    }),
  ),
  repairAttempts: z.number().max(2).default(0),
});
export type VerificationReport = z.infer<typeof VerificationReportSchema>;
