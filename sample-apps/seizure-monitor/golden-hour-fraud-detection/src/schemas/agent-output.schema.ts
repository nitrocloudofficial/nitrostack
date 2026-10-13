import { z } from 'zod';
import {
  TeamSizeRecommendationSchema,
  UrgencyLevelSchema,
  UuidSchema,
} from './common.js';

/** Known fraud types from the spec; additional values are allowed at runtime. */
export const KnownFraudTypeSchema = z.enum([
  'upi_fraud',
  'card_fraud',
  'cheque_fraud',
  'phishing',
  'investment_scam',
]);

export const FraudTypeSchema = z.union([KnownFraudTypeSchema, z.string().min(1)]);

export const TriageScaleSchema = z.object({
  victim_count_estimate: z.number().int().positive(),
  pattern_suspected: z.boolean(),
  related_ticket_ids: z.array(UuidSchema),
});

export const TriageUrgencySchema = z.object({
  level: UrgencyLevelSchema,
  /** Estimate only — not authoritative (§7.1). */
  revocability_window_remaining: z.string().min(1),
  reasoning: z.string().min(1),
});

/** Agent 1 — Triage & Classification output. */
export const Agent1TriageOutputSchema = z.object({
  ticket_id: UuidSchema,
  fraud_type: FraudTypeSchema,
  scale: TriageScaleSchema,
  urgency: TriageUrgencySchema,
  risk_score: z.number().int().min(0).max(100),
  evidence_gaps: z.array(z.string()),
});

export const AssignedPersonnelSchema = z.object({
  id: UuidSchema,
  role: z.string().min(1),
});

/** Agent 2 — Assignment output. */
export const Agent2AssignmentOutputSchema = z.object({
  ticket_id: UuidSchema,
  assigned_department_id: UuidSchema,
  assigned_personnel: z.array(AssignedPersonnelSchema),
  team_size_recommendation: TeamSizeRecommendationSchema,
  reasoning: z.string().min(1),
  escalation_flag: z.boolean(),
});

export const ApplicableLawSchema = z.object({
  name: z.string().min(1),
  section: z.string().min(1),
  summary: z.string().min(1),
  source_url: z.string().url(),
  relevance: z.string().min(1),
});

export const SuggestedActionSchema = z.object({
  action: z.string().min(1),
  /** Required — enforced at schema level (§7.3). */
  legal_basis: z.string().min(1),
  urgency: z.string().min(1),
  /** Required — enforced at schema level (§7.3). */
  citation: z.string().min(1),
});

/** Agent 3 — Legal & Solutions output. */
export const Agent3LegalOutputSchema = z.object({
  ticket_id: UuidSchema,
  jurisdiction: z.string().min(1),
  applicable_laws: z.array(ApplicableLawSchema),
  suggested_actions: z.array(SuggestedActionSchema),
  /** Explicit flag when corpus is stale or jurisdiction match is uncertain. */
  confidence_notes: z.string(),
});

export type KnownFraudType = z.infer<typeof KnownFraudTypeSchema>;
export type FraudType = z.infer<typeof FraudTypeSchema>;
export type TriageScale = z.infer<typeof TriageScaleSchema>;
export type TriageUrgency = z.infer<typeof TriageUrgencySchema>;
export type Agent1TriageOutput = z.infer<typeof Agent1TriageOutputSchema>;
export type AssignedPersonnel = z.infer<typeof AssignedPersonnelSchema>;
export type Agent2AssignmentOutput = z.infer<typeof Agent2AssignmentOutputSchema>;
export type ApplicableLaw = z.infer<typeof ApplicableLawSchema>;
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;
export type Agent3LegalOutput = z.infer<typeof Agent3LegalOutputSchema>;
