/**
 * ============================================================================
 * SHARED CONTRACT — the autonomous verification agent
 * Owner: the agent layer. Consumed by: Frontend (Agent Console), tests, audit.
 * ============================================================================
 *
 * PassportIQ has two very different execution models and they must not be
 * confused, because only one of them is agentic:
 *
 *   run_verification_pipeline  — a FIXED chain. Stage order is a constant array.
 *                                Deterministic, replayable, boring on purpose.
 *
 *   agent_investigate          — a LOOP. The agent observes what it has learned
 *                                so far, decides which tool to call next, calls
 *                                it, observes again, and stops when its own
 *                                stopping condition is met. Nothing pre-declares
 *                                the sequence. Two applications produce two
 *                                different tool sequences.
 *
 * Everything below describes the second one. An `AgentStep` is one turn of
 * observe -> think -> act -> observe, recorded verbatim so the officer can audit
 * the machine's reasoning rather than trusting it. That trace is the artefact
 * that makes the autonomy reviewable, so it is a frozen contract, not a log line.
 */
import { z } from 'zod';

/** What the agent is trying to achieve on this run. */
export const AgentGoalSchema = z.enum([
  /** Establish whether this application is safe to approve. The default. */
  'assess_application',
  /** Something already looks wrong — chase the fraud hypothesis specifically. */
  'investigate_fraud_signal',
  /** Sweep the whole queue and rank it by how urgently a human is needed. */
  'triage_queue',
]);
export type AgentGoal = z.infer<typeof AgentGoalSchema>;

/**
 * The actions the agent is permitted to take.
 *
 * This is an allow-list, and that is the point: an agent that can only choose
 * from an enumerated action space cannot invent a call that writes an outcome.
 * `officer_decide` is deliberately absent — see AgentRunSchema.handoff.
 */
export const AgentActionSchema = z.enum([
  'document_validate',
  'ocr_extract',
  'check_identity_consistency',
  'check_address_consistency',
  'detect_duplicate_signals',
  'build_risk_graph',
  'visual_similarity_flag',
  'evaluate_rules',
  'score_risk',
  'explain_risk',
  /** Terminal: hand the case to a human with a recommendation attached. */
  'handoff_to_officer',
]);
export type AgentAction = z.infer<typeof AgentActionSchema>;

/** One turn of the loop. */
export const AgentStepSchema = z.object({
  /** 1-based turn number within this run. */
  step: z.number().int().positive(),
  /** Why the agent chose this action, in its own words. */
  thought: z.string().min(1),
  action: AgentActionSchema,
  /** Arguments the agent chose for the action. */
  actionInput: z.record(z.unknown()),
  /** What came back, summarised to something an officer can read. */
  observation: z.string().min(1),
  /** Did the call succeed? A failed action is kept in the trace, not hidden. */
  status: z.enum(['ok', 'failed', 'skipped']),
  /** 0..1 — the agent's confidence in its own conclusion after this step. */
  confidence: z.number().min(0).max(1),
  /** How the action was chosen: an LLM plan, or the deterministic policy. */
  plannedBy: z.enum(['llm', 'policy']),
  durationMs: z.number().nonnegative(),
  at: z.string().min(1),
});
export type AgentStep = z.infer<typeof AgentStepSchema>;

/**
 * The terminal handoff.
 *
 * `recommendation` is a RECOMMENDATION. The agent has no path to officer_decide:
 * that tool is guarded, and the guard requires a human `officer` identity. This
 * object is the entire extent of the machine's authority.
 */
export const AgentHandoffSchema = z.object({
  recommendation: z.enum(['approve', 'clarify', 'reject', 'escalate']),
  rationale: z.string().min(1),
  /** 0..1 — how sure the agent is. Below the escalation floor it says so. */
  confidence: z.number().min(0).max(1),
  /** Ordered worst-first. What a human should look at, and in what order. */
  officerChecklist: z.array(z.string()),
  /** Set when confidence is below the floor, or a hard escalation rule fired. */
  requiresSeniorReview: z.boolean(),
  /** Always true. Stated in the payload so no UI can imply otherwise. */
  humanDecisionRequired: z.literal(true),
});
export type AgentHandoff = z.infer<typeof AgentHandoffSchema>;

export const AgentRunSchema = z.object({
  runId: z.string().min(1),
  applicationId: z.string().min(1),
  goal: AgentGoalSchema,
  /** 'llm' when a model planned the turns, 'policy' for the deterministic planner. */
  planner: z.enum(['llm', 'policy']),
  model: z.string().nullable(),
  steps: z.array(AgentStepSchema),
  /** Why the loop stopped. `max_steps` means it ran out of budget, not that it finished. */
  stopReason: z.enum(['goal_satisfied', 'handoff', 'max_steps', 'blocked', 'error']),
  handoff: AgentHandoffSchema.nullable(),
  /** Score the agent ended up with, if score_risk ran. */
  riskScore: z.number().nullable(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  totalDurationMs: z.number().nonnegative(),
});
export type AgentRun = z.infer<typeof AgentRunSchema>;

/** One row of the autonomous queue sweep. */
export const TriageRowSchema = z.object({
  applicationId: z.string().min(1),
  applicantName: z.string().min(1),
  applicationType: z.string().min(1),
  riskScore: z.number().nullable(),
  band: z.enum(['low', 'medium', 'high']).nullable(),
  recommendation: z.enum(['approve', 'clarify', 'reject', 'escalate']),
  /** Integer rank: 1 = look at this one first. */
  priority: z.number().int().positive(),
  headline: z.string().min(1),
  clusterSize: z.number().int().positive(),
  requiresSeniorReview: z.boolean(),
  runId: z.string().min(1),
});
export type TriageRow = z.infer<typeof TriageRowSchema>;

export const TriageResultSchema = z.object({
  /** Highest priority first — this IS the officer's work queue. */
  queue: z.array(TriageRowSchema),
  processed: z.number().int().nonnegative(),
  /** Applications the agent wants a human to look at before anything else. */
  escalated: z.array(z.string()),
  /** Rings the sweep uncovered by correlating across the whole queue. */
  detectedRings: z.array(
    z.object({
      applicationIds: z.array(z.string()),
      size: z.number().int().positive(),
      sharedSignals: z.array(z.string()),
      headline: z.string().min(1),
    })
  ),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  totalDurationMs: z.number().nonnegative(),
});
export type TriageResult = z.infer<typeof TriageResultSchema>;

/** Event names the agent publishes. Frontend subscribes to these for the live trace. */
export const AGENT_STEP_EVENT = 'agent.step' as const;
export const AGENT_RUN_STARTED_EVENT = 'agent.run_started' as const;
export const AGENT_RUN_FINISHED_EVENT = 'agent.run_finished' as const;

export const AgentStepEventSchema = z.object({
  runId: z.string().min(1),
  applicationId: z.string().min(1),
  step: AgentStepSchema,
});
export type AgentStepEvent = z.infer<typeof AgentStepEventSchema>;
