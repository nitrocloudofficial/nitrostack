/**
 * ============================================================================
 * SHARED CONTRACT — Backend A verification stage outputs
 * Owner: Backend A. Consumed by: Frontend A (timeline, risk panel),
 *        Frontend B (Evidence Explorer), the agent layer, and evaluate_rules.
 * ============================================================================
 *
 * contracts.md pins three things: the seed-applicant shape (§1), the `score_risk`
 * combined INPUT shape (§2), and the `pipeline.stage_completed` envelope (§3).
 * It deliberately says nothing about what each Backend A stage RETURNS, which is
 * exactly the gap that made Frontend A/B build against guesses. This file closes
 * it: every Backend A stage output is a Zod schema here, imported by both the
 * tool that produces it and any consumer that reads it.
 *
 * Compatibility rule followed throughout: where the build doc named a field
 * (`missingDocuments`, `complete`, `consistent`, `mismatches[].sources`, `score`,
 * `factors`, `explanation`, `similarityFlag`), that field name is preserved
 * VERBATIM. Extra fields are additive, so a consumer written against the build
 * doc keeps working while a consumer that wants the richer evidence has it.
 */
import { z } from 'zod';
import { DocumentTypeSchema } from './seed-applicant.contract.js';

/** Severity vocabulary shared by rules, mismatches and duplicate signals. */
export const SeveritySchema = z.enum(['low', 'medium', 'high']);
export type Severity = z.infer<typeof SeveritySchema>;

/** Risk band derived from the 0-100 score. Thresholds live in RiskService. */
export const RiskBandSchema = z.enum(['low', 'medium', 'high']);
export type RiskBand = z.infer<typeof RiskBandSchema>;

// ---------------------------------------------------------------------------
// 1. document_validate
// ---------------------------------------------------------------------------

/** One row of the required-document checklist, so the UI can render a table. */
export const DocumentChecklistRowSchema = z.object({
  documentType: DocumentTypeSchema,
  required: z.boolean(),
  present: z.boolean(),
  documentId: z.string().nullable(),
  /** null when the document carries no expiry (a photograph, for example). */
  expiresOn: z.string().nullable(),
  expired: z.boolean(),
  /** Days until expiry; negative when already expired, null when not dated. */
  daysToExpiry: z.number().nullable(),
});
export type DocumentChecklistRow = z.infer<typeof DocumentChecklistRowSchema>;

export const DocumentValidateResultSchema = z.object({
  applicationId: z.string().min(1),
  applicationType: z.string().min(1),

  // --- build-doc field names, preserved verbatim -------------------------
  missingDocuments: z.array(z.string()),
  expiredDocuments: z.array(z.string()),
  complete: z.boolean(),

  // --- additive: what the officer UI actually needs ----------------------
  requiredDocuments: z.array(z.string()),
  presentDocuments: z.array(z.string()),
  /** Present, in date, but expiring inside DOCUMENT_EXPIRY_WARNING_DAYS. */
  expiringSoonDocuments: z.array(z.string()),
  unexpectedDocuments: z.array(z.string()),
  checklist: z.array(DocumentChecklistRowSchema),
  findings: z.array(z.object({ severity: SeveritySchema, detail: z.string() })),
});
export type DocumentValidateResult = z.infer<typeof DocumentValidateResultSchema>;

// ---------------------------------------------------------------------------
// 2. ocr_extract
// ---------------------------------------------------------------------------

export const OcrExtractResultSchema = z.object({
  applicationId: z.string().min(1),
  documentType: z.string().min(1),
  documentId: z.string().min(1),

  // --- build-doc field names, preserved verbatim -------------------------
  name: z.string(),
  dob: z.string().optional(),
  address: z.string().optional(),
  documentNumber: z.string().optional(),
  parentNames: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  uncertainFields: z.array(z.string()).optional(),

  // --- additive ----------------------------------------------------------
  /** Field-by-field confidence, so the UI can highlight the weak reads. */
  fieldConfidence: z.record(z.number()),
  /** 'vision-llm' when a model actually read the scan, 'deterministic' otherwise. */
  extractionMode: z.enum(['vision-llm', 'deterministic']),
  /** Model id when extractionMode is 'vision-llm'. */
  model: z.string().nullable(),
  imageHash: z.string().min(1),
});
export type OcrExtractResult = z.infer<typeof OcrExtractResultSchema>;

// ---------------------------------------------------------------------------
// 3 + 4. check_identity_consistency / check_address_consistency
// ---------------------------------------------------------------------------

/**
 * One conflicting field.
 *
 * `sources` is the frozen shape Frontend B's Evidence Explorer renders directly:
 * a map of source label -> the value that source states, e.g.
 * `{ application_form: 'Rohan Kumar Sharma', aadhaar: 'Rohan Sharma' }`.
 */
export const FieldMismatchSchema = z.object({
  field: z.string().min(1),
  sources: z.record(z.string()),
  /** 0..1 similarity between the two most-distant values. 1 = identical. */
  similarity: z.number().min(0).max(1),
  severity: SeveritySchema,
  /** Plain-language reason the officer reads in the Evidence Explorer card. */
  detail: z.string().min(1),
});
export type FieldMismatch = z.infer<typeof FieldMismatchSchema>;

export const ConsistencyResultSchema = z.object({
  applicationId: z.string().min(1),
  /** 'identity' | 'address' — lets one UI component render both stages. */
  scope: z.enum(['identity', 'address']),

  // --- build-doc field names, preserved verbatim -------------------------
  consistent: z.boolean(),
  mismatches: z.array(FieldMismatchSchema),

  // --- additive ----------------------------------------------------------
  comparedFields: z.array(z.string()),
  comparedDocuments: z.array(z.string()),
  /** Worst severity across all mismatches; null when consistent. */
  worstSeverity: SeveritySchema.nullable(),
});
export type ConsistencyResult = z.infer<typeof ConsistencyResultSchema>;

// ---------------------------------------------------------------------------
// 5. visual_similarity_flag  (LLM-based flag — explicitly NOT a biometric match)
// ---------------------------------------------------------------------------

export const VisualSimilarityResultSchema = z.object({
  applicationId: z.string().min(1),
  compareToApplicationId: z.string().min(1),

  // --- build-doc field names, preserved verbatim -------------------------
  similarityFlag: z.enum(['likely_same', 'unclear', 'likely_different']),
  reasoning: z.string().min(1),

  // --- additive ----------------------------------------------------------
  /** true when the two photographs are byte-identical (same imageHash). */
  identicalImageHash: z.boolean(),
  subjectPhotoHash: z.string().nullable(),
  comparisonPhotoHash: z.string().nullable(),
  mode: z.enum(['vision-llm', 'deterministic']),
  /**
   * Always present, always the same text. The demo claims a similarity FLAG, not
   * a verified identity match, and the disclaimer travels with the payload so a
   * UI cannot accidentally present it as biometric proof.
   */
  disclaimer: z.string().min(1),
});
export type VisualSimilarityResult = z.infer<typeof VisualSimilarityResultSchema>;

// ---------------------------------------------------------------------------
// 6. evaluate_rules
// ---------------------------------------------------------------------------

export const RuleViolationSchema = z.object({
  // --- build-doc field names, preserved verbatim -------------------------
  rule: z.string().min(1),
  detail: z.string().min(1),

  // --- additive ----------------------------------------------------------
  ruleId: z.string().min(1),
  severity: SeveritySchema,
  /** Statutory / policy hook, so the officer can cite it in a letter. */
  citation: z.string().min(1),
  /** Which pipeline stage supplied the facts that fired this rule. */
  sourceStage: z.string().min(1),
  evidence: z.array(z.string()),
});
export type RuleViolation = z.infer<typeof RuleViolationSchema>;

export const EvaluateRulesResultSchema = z.object({
  applicationId: z.string().min(1),

  // --- build-doc field names, preserved verbatim -------------------------
  violations: z.array(RuleViolationSchema),
  passed: z.boolean(),

  // --- additive ----------------------------------------------------------
  /** Every rule considered, so "we checked and it passed" is visible too. */
  evaluatedRuleIds: z.array(z.string()),
  /** Rules skipped because an upstream stage had not run. */
  skippedRuleIds: z.array(z.string()),
  /** Alias kept for the branch's earlier consumers. Same rows as `violations`. */
  firedRules: z.array(RuleViolationSchema),
  worstSeverity: SeveritySchema.nullable(),
});
export type EvaluateRulesResult = z.infer<typeof EvaluateRulesResultSchema>;

// ---------------------------------------------------------------------------
// 7. score_risk
// ---------------------------------------------------------------------------

export const RiskFactorSchema = z.object({
  // --- build-doc field names, preserved verbatim -------------------------
  reason: z.string().min(1),
  weight: z.number(),

  // --- additive ----------------------------------------------------------
  factorId: z.string().min(1),
  category: z.enum(['documents', 'identity', 'address', 'duplicates', 'graph', 'rules', 'photo']),
  severity: SeveritySchema,
  /** Points this factor contributed AFTER capping. Equal to `weight`. */
  points: z.number(),
  sourceStage: z.string().min(1),
});
export type RiskFactor = z.infer<typeof RiskFactorSchema>;

export const ScoreRiskResultSchema = z.object({
  applicationId: z.string().min(1),

  /**
   * MUST be named `score`. PipelineStateService.getRiskScore() reads exactly this
   * key, PipelineCompleteGuard reads getRiskScore(), and the audit trail
   * snapshots it. Rename it and the decision gate silently never opens.
   */
  score: z.number().min(0).max(100),
  factors: z.array(RiskFactorSchema),

  // --- additive ----------------------------------------------------------
  band: RiskBandSchema,
  /** 0..1 — how much of the pipeline actually reported in. */
  confidence: z.number().min(0).max(1),
  /** Per-category subtotal, drives the risk panel's breakdown bars. */
  categoryTotals: z.record(z.number()),
  /** Stages missing at scoring time; a caveat the officer must see. */
  missingStages: z.array(z.string()),
  /** Alias kept for the branch's earlier consumers. */
  contributions: z.array(z.object({ factor: z.string(), points: z.number() })),
  scoredAt: z.string().min(1),
});
export type ScoreRiskResult = z.infer<typeof ScoreRiskResultSchema>;

// ---------------------------------------------------------------------------
// 8. explain_risk
// ---------------------------------------------------------------------------

export const ExplainRiskResultSchema = z.object({
  applicationId: z.string().min(1),

  // --- build-doc field names, preserved verbatim -------------------------
  score: z.number().nullable(),
  explanation: z.string().min(1),

  // --- additive ----------------------------------------------------------
  band: RiskBandSchema.nullable(),
  applicantName: z.string().min(1),
  /** One bullet per finding, already ordered worst-first. */
  evidence: z.array(z.string()),
  /** What the officer should do next — a recommendation, never a decision. */
  recommendedAction: z.enum(['approve', 'clarify', 'reject', 'escalate']),
  recommendationRationale: z.string().min(1),
  /** Questions to put to the applicant if the officer requests clarification. */
  clarificationQuestions: z.array(z.string()),
  narrationMode: z.enum(['llm', 'deterministic']),
  model: z.string().nullable(),
});
export type ExplainRiskResult = z.infer<typeof ExplainRiskResultSchema>;
