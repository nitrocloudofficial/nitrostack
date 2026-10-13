/**
 * SentinelPay AI — Prompt-Injection Defense
 * Source: Technical Specification §8.9 (Prompt injection defense), §12.6 (Threat model)
 *
 * Invoice/document content is data, never instructions. This module never
 * "executes" or acts on document text — it only tags it for detection
 * visibility (so the agent/UI can flag suspicious content to a human) and
 * renders it back clearly labeled as untrusted, quoted data. The four
 * system invariants below cannot be altered by any document content,
 * under any framing, ever — that is enforced structurally (no code path
 * reads document text to decide permissions/policy/instructions/approval),
 * not just by this module's detection heuristic.
 */

export interface UntrustedDocument {
  sourceUri: string;
  text: string;
  flaggedAsInjectionAttempt: boolean;
}

/**
 * Heuristic-only detection for operator/UI visibility. This is NOT a
 * security boundary by itself — the real boundary is that nothing in the
 * system ever reads document text as instructions (§8.9, §12.8 sandbox
 * strategy). Missing a pattern here degrades a warning, not the guarantee.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /you\s+are\s+now\b/i,
  /new\s+system\s+prompt/i,
  /act\s+as\s+(if\s+you\s+are\s+)?an?\b/i,
  /approve\s+(this|the)\s+payment/i,
  /release\s+(the\s+)?funds/i,
  /transfer\s+(the\s+)?funds/i,
  /bypass\s+(approval|review|policy)/i,
];

/** Wraps raw document text as an explicitly untrusted, provenance-tagged record. */
export function tagAsUntrustedData(sourceUri: string, text: string): UntrustedDocument {
  return {
    sourceUri,
    text,
    flaggedAsInjectionAttempt: INJECTION_PATTERNS.some((pattern) => pattern.test(text)),
  };
}

/**
 * Renders an untrusted document for display/logging with an unambiguous
 * label and quoting, so a human or the agent can never mistake it for a
 * system instruction.
 */
export function sanitizeForDisplay(doc: UntrustedDocument): string {
  const label = doc.flaggedAsInjectionAttempt
    ? "Untrusted document text (flagged: possible instruction-injection attempt; treated as inert data only)"
    : "Untrusted document text";
  return `[${label}]\nSource: ${doc.sourceUri}\n"""\n${doc.text}\n"""`;
}

/**
 * §8.9 — the four invariants no document content can ever change, under
 * any framing. Frozen so this cannot be mutated at runtime by anything,
 * including a compromised/misbehaving upstream module.
 */
export const IMMUTABLE_UNDER_INJECTION = Object.freeze({
  toolPermissionsCanChange: false,
  policyCanChange: false,
  systemInstructionsCanChange: false,
  approvalRequirementCanBeWaived: false,
});
