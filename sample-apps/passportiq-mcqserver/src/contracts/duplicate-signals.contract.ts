/**
 * ============================================================================
 * SHARED CONTRACT — detect_duplicate_signals output
 * Owner: Backend B. Consumed by: score_risk (Backend A), GraphView (Frontend B).
 * ============================================================================
 *
 * ⚠️ TWO SHAPES WERE SPECIFIED FOR THIS TOOL, AND THEY DISAGREE.
 *
 *   contracts.md §2 (team kickoff, "non-negotiable"):
 *     { applicationId, signals: [{ signalId, type, severity, confidence,
 *                                  matchedApplicationId, evidence }] }
 *
 *   PassportIQ_BackendB.docx §3.1 (my build doc):
 *     { reusedPhone?, reusedAddress?, reusedDocumentImage?, linkedApplicantIds }
 *
 * Resolution: emit BOTH. contracts.md §2 is authoritative and its fields are
 * top-level and exactly as specified, so score_risk's parse succeeds. The docx
 * fields are added ALONGSIDE as a compatibility view, derived from the same
 * signals — never computed independently, so the two can never drift.
 *
 * This works because Zod object schemas are non-strict by default: Backend A
 * parsing with DetectDuplicateSignalsResultSchema silently strips the extra
 * keys instead of throwing. Nobody has to change their code, and nobody is
 * blocked waiting for a contract renegotiation mid-hackathon.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// contracts.md §2 — VERBATIM. DO NOT EDIT.
// ---------------------------------------------------------------------------
export const DuplicateSignalSchema = z.object({
  signalId: z.string().min(1),
  type: z.enum([
    'passport_number_match',
    'name_dob_match',
    'email_match',
    'phone_match',
    'document_similarity',
    'manual_review_flag',
  ]),
  severity: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  matchedApplicationId: z.string().min(1),
  evidence: z.record(z.unknown()).default({}),
});
export type DuplicateSignal = z.infer<typeof DuplicateSignalSchema>;
export type DuplicateSignalType = DuplicateSignal['type'];
export type SignalSeverity = DuplicateSignal['severity'];

export const DetectDuplicateSignalsResultSchema = z.object({
  applicationId: z.string().min(1),
  signals: z.array(DuplicateSignalSchema),
});
export type DetectDuplicateSignalsResult = z.infer<typeof DetectDuplicateSignalsResultSchema>;

// ---------------------------------------------------------------------------
// Backend B: address reuse has no home in the frozen enum
// ---------------------------------------------------------------------------

/**
 * The `type` enum above has no `address_match` member, but reused ADDRESSES are
 * a required Backend B signal (build doc §2) and a named beat in the demo script
 * ("reused phone, reused address, a reused document photo").
 *
 * Emitting a value outside the enum would make Backend A's z.enum parse throw
 * and take the whole pipeline down mid-demo, so address matches ride inside the
 * contract-legal `manual_review_flag` type and declare their real identity in
 * `evidence.signalSubtype`. The human-readable `evidence.reason` means the
 * dashboard still says "reused address" to the officer.
 *
 * ACTION FOR THE TEAM: adding 'address_match' to the contracts.md §2 enum is a
 * one-word change and would let this alias go away. Flip this constant the
 * moment that is agreed in writing — nothing else needs to change.
 */
export const ADDRESS_MATCH_SIGNAL_TYPE: DuplicateSignalType = 'manual_review_flag';

/** Value stored in `evidence.signalSubtype` so address matches stay findable. */
export const ADDRESS_MATCH_SUBTYPE = 'address_match' as const;

// ---------------------------------------------------------------------------
// BackendB.docx §3.1 compatibility view — additive, derived
// ---------------------------------------------------------------------------

/**
 * The build-doc shape, carried alongside the canonical one.
 *
 * Each array holds the OTHER applications that reuse that signal (never the
 * application being checked), which is what "reusedPhone" means to a reader of
 * the GraphView. `linkedApplicantIds` is the de-duplicated union across all
 * signal types.
 */
export const DuplicateSignalsCompatViewSchema = z.object({
  reusedPhone: z.array(z.string()).optional(),
  reusedAddress: z.array(z.string()).optional(),
  reusedDocumentImage: z.array(z.string()).optional(),
  linkedApplicantIds: z.array(z.string()),
});
export type DuplicateSignalsCompatView = z.infer<typeof DuplicateSignalsCompatViewSchema>;

/**
 * What detect_duplicate_signals actually returns: contracts.md §2 fields at the
 * top level, plus the docx compatibility view, plus a small human-readable
 * `summary` the dashboard can render without re-deriving anything.
 */
export const DetectDuplicateSignalsToolOutputSchema = DetectDuplicateSignalsResultSchema.merge(
  DuplicateSignalsCompatViewSchema
).extend({
  summary: z.object({
    signalCount: z.number().int().min(0),
    highestSeverity: z.enum(['none', 'low', 'medium', 'high']),
    linkedApplicationCount: z.number().int().min(0),
    headline: z.string(),
  }),
});
export type DetectDuplicateSignalsToolOutput = z.infer<
  typeof DetectDuplicateSignalsToolOutputSchema
>;

// ---------------------------------------------------------------------------
// Severity helpers — shared so scoring and graph colouring never disagree
// ---------------------------------------------------------------------------

/** Numeric weight per severity. Single source of truth for all risk arithmetic. */
export const SEVERITY_WEIGHT: Record<SignalSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const SEVERITY_ORDER: SignalSeverity[] = ['low', 'medium', 'high'];

/** Highest severity present in a set of signals, or 'none' when empty. */
export function highestSeverity(
  signals: readonly DuplicateSignal[]
): 'none' | SignalSeverity {
  let best = -1;
  for (const signal of signals) {
    best = Math.max(best, SEVERITY_ORDER.indexOf(signal.severity));
  }
  return best === -1 ? 'none' : SEVERITY_ORDER[best];
}

/** True when this signal represents reuse of a postal address. */
export function isAddressSignal(signal: DuplicateSignal): boolean {
  return (
    signal.type === ADDRESS_MATCH_SIGNAL_TYPE &&
    signal.evidence?.['signalSubtype'] === ADDRESS_MATCH_SUBTYPE
  );
}
