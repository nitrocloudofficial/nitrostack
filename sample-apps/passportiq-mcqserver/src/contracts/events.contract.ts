/**
 * ============================================================================
 * SHARED CONTRACT — pipeline events
 * Owner: Backend B. Consumed by: everyone.
 * Mirrors contracts.md §3 exactly. Do not change without a written team agreement.
 * ============================================================================
 */
import { z } from 'zod';

/** Canonical event names. Import these instead of typing the strings. */
export const PIPELINE_STAGE_COMPLETED = 'pipeline.stage_completed' as const;
export const APPLICATION_DECIDED = 'application.decided' as const;

/**
 * The envelope EVERY tool emits when it finishes — Backend A's 7 tools and
 * Backend B's tools alike. Frontend A's timeline parses this shape directly and
 * will break silently if fields are renamed, omitted, or nested differently.
 *
 * contracts.md §3 defines exactly these three fields. `stage` is a plain string
 * (not an enum) so Backend A can add stages without a contract renegotiation.
 */
export const PipelineStageCompletedEventSchema = z.object({
  applicationId: z.string().min(1),
  stage: z.string().min(1),
  result: z.record(z.unknown()),
});
export type PipelineStageCompletedEvent = z.infer<typeof PipelineStageCompletedEventSchema>;

/**
 * Emitted by officer_decide only. Frontend B's audit trail listens on this.
 * Not specified in contracts.md — defined here by Backend B, who owns
 * officer_decide and the audit log.
 */
export const ApplicationDecidedEventSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(['approve', 'clarify', 'reject']),
  officer: z.string().min(1),
  note: z.string().optional(),
  decidedAt: z.string().datetime(),
});
export type ApplicationDecidedEvent = z.infer<typeof ApplicationDecidedEventSchema>;

/**
 * The full pipeline, in execution order.
 *
 * `officer_decide` is deliberately NOT in this list: it is the human decision
 * gate that runs after the pipeline, and PipelineCompleteGuard derives its
 * required-stage set from here.
 */
export const PIPELINE_STAGES = [
  'document_validate',
  'ocr_extract',
  'check_identity_consistency',
  'check_address_consistency',
  'detect_duplicate_signals',
  'build_risk_graph',
  'visual_similarity_flag', // optional / stretch — NOT required by the guard
  'evaluate_rules',
  'score_risk',
  'explain_risk',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/**
 * Stages that must have completed before officer_decide is allowed to run.
 *
 * visual_similarity_flag is excluded because the build plan marks it
 * optional/stretch and cuttable at Hour 8 — if the guard required it, cutting
 * the tool would silently make every decision impossible.
 */
export const REQUIRED_STAGES_BEFORE_DECISION: readonly PipelineStage[] = PIPELINE_STAGES.filter(
  (stage) => stage !== 'visual_similarity_flag'
);

/** Stages owned by Backend B. Used by the orchestrator + docs, not by the guard. */
export const BACKEND_B_STAGES: readonly PipelineStage[] = [
  'detect_duplicate_signals',
  'build_risk_graph',
];
