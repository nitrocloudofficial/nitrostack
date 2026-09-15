/**
 * ============================================================================
 * SHARED CONTRACT — officer_decide input / output + audit trail
 * Owner: Backend B. Consumed by: Frontend B (decision controls + audit trail).
 * ============================================================================
 */
import { z } from 'zod';

/** docx §3.3 — the three decisions an officer can record. The AI never decides. */
export const OfficerDecisionSchema = z.enum(['approve', 'clarify', 'reject']);
export type OfficerDecision = z.infer<typeof OfficerDecisionSchema>;

export const OfficerDecideInputSchema = z.object({
  applicationId: z.string().min(1).describe('Passport application ID being decided'),
  decision: OfficerDecisionSchema.describe(
    'approve = issue, clarify = request more documents from the applicant, reject = refuse'
  ),
  note: z
    .string()
    .max(2000)
    .optional()
    .describe("Officer's free-text justification, stored verbatim in the audit trail"),
});
export type OfficerDecideInput = z.infer<typeof OfficerDecideInputSchema>;

/**
 * One immutable audit-trail entry. Frontend B renders these chronologically as
 * "who decided what, when, and why".
 *
 * `stagesCompleted` and `riskScoreAtDecision` are snapshotted at decision time
 * on purpose: an audit trail that says "approved" without recording what the
 * officer could actually see when they approved is not a paper trail a regulator
 * would accept.
 */
export const DecisionRecordSchema = z.object({
  recordId: z.string().min(1),
  applicationId: z.string().min(1),
  applicantName: z.string().min(1),
  decision: OfficerDecisionSchema,
  note: z.string().optional(),
  officer: z.string().min(1),
  decidedAt: z.string().datetime(),
  status: z.enum(['approved', 'clarification_requested', 'rejected']),
  stagesCompleted: z.array(z.string()),
  riskScoreAtDecision: z.number().min(0).max(100).nullable(),
  linkedApplicationIds: z.array(z.string()),
});
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;

/** Maps a decision verb to the terminal application status it writes. */
export const DECISION_TO_STATUS: Record<OfficerDecision, DecisionRecord['status']> = {
  approve: 'approved',
  clarify: 'clarification_requested',
  reject: 'rejected',
};

export const AuditTrailSchema = z.object({
  entries: z.array(DecisionRecordSchema),
  total: z.number().int().min(0),
});
export type AuditTrail = z.infer<typeof AuditTrailSchema>;
