import { z } from 'zod';

// --- Canonical Controlled Vocabularies ---
export type AgentVerdict = 'approved' | 'flagged' | 'blocked';
export type ModeratorDecision = 'approved' | 'approved_with_conditions' | 'blocked';

export const AgentVerdictSchema = z.enum(['approved', 'flagged', 'blocked']);
export const ModeratorDecisionSchema = z.enum(['approved', 'approved_with_conditions', 'blocked']);

// --- Concern Schema ---
export const ConcernSchema = z.object({
  id: z.string(),
  category: z.string(),
  tags: z.array(z.string()).min(1),
  issue: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  recommendation: z.string(),
  responds_to: z.string().nullable(),
  status: z.enum(['open', 'challenged', 'resolved', 'escalated']),
  requested_context: z.string().nullable()
});

export type Concern = z.infer<typeof ConcernSchema>;

// --- Agent Extension Schemas ---
export const OpportunityCostEstimateSchema = z.object({
  reach: z.enum(['low', 'medium', 'high', 'massive']),
  impact: z.enum(['minimal', 'low', 'medium', 'high', 'massive']),
  confidence: z.enum(['low', 'medium', 'high']),
  effort: z.enum(['small', 'medium', 'large', 'massive']),
  effort_source: z.enum(['provisional', 'reconciled_with_engineering'])
});

export type OpportunityCostEstimate = z.infer<typeof OpportunityCostEstimateSchema>;

export const EffortAssessmentSchema = z.object({
  size: z.enum(['small', 'medium', 'large', 'massive']),
  basis: z.enum(['known_pattern', 'novel_integration', 'hidden_integration_cost']),
  confidence: z.enum(['low', 'medium', 'high']),
  source: z.enum(['initial', 'revised_post_challenge']),
  revision_reason: z.string().nullable()
});

export type EffortAssessment = z.infer<typeof EffortAssessmentSchema>;

// --- Department Output Schemas ---
export const BaseDepartmentOutputSchema = z.object({
  agent: z.enum(['product', 'engineering', 'security', 'legal']),
  verdict: AgentVerdictSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  concerns: z.array(ConcernSchema),
  opportunity_cost_estimate: OpportunityCostEstimateSchema.optional(),
  effort_assessment: EffortAssessmentSchema.optional()
}).strict();

export type DepartmentOutput = z.infer<typeof BaseDepartmentOutputSchema>;

// --- Challenge Round Output Schema ---
export const ChallengeRoundOutputSchema = z.object({
  agent: z.enum(['product', 'engineering', 'security', 'legal']),
  responds_to: z.string(),
  stance: z.enum(['agree', 'disagree', 'partially_agree', 'provides_fact']),
  response: z.string(),
  revised_verdict: AgentVerdictSchema.nullable(),
  effort_assessment: EffortAssessmentSchema.optional(),
  opportunity_cost_estimate: OpportunityCostEstimateSchema.optional()
}).strict();

export type ChallengeRoundOutput = z.infer<typeof ChallengeRoundOutputSchema>;

// --- Moderator Output Schema ---
export const UnresolvedRiskSchema = z.object({
  concern_id: z.string(),
  agent: z.enum(['product', 'engineering', 'security', 'legal']),
  why_unresolved: z.string()
});

export const RequiredActionSchema = z.object({
  action: z.string(),
  owner_agent: z.enum(['product', 'engineering', 'security', 'legal']),
  concern_id: z.string()
});

export const AgentAlignmentSchema = z.object({
  product: AgentVerdictSchema,
  engineering: AgentVerdictSchema,
  security: AgentVerdictSchema,
  legal: AgentVerdictSchema
});

export const ModeratorOutputSchema = z.object({
  decision: ModeratorDecisionSchema,
  decision_basis: z.string(),
  overall_summary: z.string(),
  unresolved_risks: z.array(UnresolvedRiskSchema),
  required_actions: z.array(RequiredActionSchema),
  agent_alignment: AgentAlignmentSchema
}).strict();

export type ModeratorOutput = z.infer<typeof ModeratorOutputSchema>;
