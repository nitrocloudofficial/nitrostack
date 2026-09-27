/**
 * AEGIS — the trust guardrail (framework-free, deterministic). It intercepts any
 * output or proposed action, scores its trustworthiness from independent rule-
 * based detectors, and rewrites it to a safe fallback when needed. It is the
 * connective tissue of COMMAND: every other domain routes its actions through
 * AEGIS so nothing acts unchecked.
 *
 * Deterministic on purpose (no model call) so it's fast, auditable, and testable.
 * In production these detectors would be backed by a second model + classifiers;
 * the contract (score + issues + rewrite) is what matters.
 */

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface TrustIssue {
  type: string;
  severity: Severity;
  detail: string;
}

export interface TrustAssessment {
  trustScore: number; // 0..1, higher = safer
  safe: boolean;
  issues: TrustIssue[];
  rewrite: string | null; // a safer version when unsafe, else null
}

const WEIGHT: Record<Severity, number> = { low: 0.15, medium: 0.25, high: 0.4, critical: 0.6 };
const SAFE_THRESHOLD = 0.6;

interface Detector {
  type: string;
  severity: Severity;
  test: RegExp;
  detail: string;
  redact?: (s: string) => string;
}

const DETECTORS: Detector[] = [
  {
    type: 'dangerous_command', severity: 'critical',
    // No trailing \b: several patterns end in a non-word char (e.g. "/"), where \b never matches.
    test: /\b(rm\s+-rf\s+\/|drop\s+table|shutdown\s+-h|mkfs|curl[^\n]*\|\s*sh|disable\s+(auth|firewall|mfa))/i,
    detail: 'Destructive or security-disabling command detected.',
    redact: (s) => s.replace(/\b(rm\s+-rf\s+\/[^\s]*|drop\s+table[^\n.;]*|shutdown\s+-h[^\n.;]*|curl[^\n]*\|\s*sh|disable\s+(auth|firewall|mfa))/gi, '[BLOCKED: destructive action removed by AEGIS]'),
  },
  {
    type: 'prompt_injection', severity: 'high',
    test: /\b(ignore (all )?previous instructions|disregard your (system )?prompt|reveal your (system )?(prompt|instructions))\b/i,
    detail: 'Prompt-injection / instruction-override attempt detected.',
    redact: (s) => s.replace(/\b(ignore (all )?previous instructions|disregard your (system )?prompt|reveal your (system )?(prompt|instructions))[^.\n]*/gi, '[BLOCKED: injected instruction removed by AEGIS]'),
  },
  {
    type: 'pii_leak', severity: 'medium',
    test: /(\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|\b\d{4}[- ]\d{4}[- ]\d{4}\b)/,
    detail: 'Possible PII (card / email / ID) present in output.',
    redact: (s) => s
      .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[REDACTED-CARD]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED-EMAIL]')
      .replace(/\b\d{4}[- ]\d{4}[- ]\d{4}\b/g, '[REDACTED-ID]'),
  },
  {
    type: 'overclaim', severity: 'low',
    test: /\b(100%\s+(safe|guaranteed|secure)|guaranteed to (work|never fail)|will never fail|absolutely no risk)\b/i,
    detail: 'Unsupported absolute claim; may mislead.',
    redact: (s) => s.replace(/\b(100%\s+(safe|guaranteed|secure)|guaranteed to (work|never fail)|will never fail|absolutely no risk)\b/gi, 'expected to work (verify before relying on it)'),
  },
];

/** Assess a piece of text (a model output or a proposed action description). */
export function assessTrust(text: string): TrustAssessment {
  const issues: TrustIssue[] = [];
  let working = text;
  let changed = false;
  let hasCritical = false;
  let hasHigh = false;

  for (const d of DETECTORS) {
    if (d.test.test(text)) {
      issues.push({ type: d.type, severity: d.severity, detail: d.detail });
      if (d.severity === 'critical') hasCritical = true;
      if (d.severity === 'high') hasHigh = true;
      if (d.redact) {
        working = d.redact(working);
        changed = true;
      }
    }
  }

  const penalty = issues.reduce((sum, i) => sum + WEIGHT[i.severity], 0);
  const trustScore = Math.round(Math.max(0, 1 - penalty) * 100) / 100;
  // Any high/critical issue blocks; medium/low can stay "safe" but are still
  // rewritten (e.g. PII redacted) when a safer version exists.
  const safe = trustScore >= SAFE_THRESHOLD && !hasCritical && !hasHigh;

  return { trustScore, safe, issues, rewrite: changed ? working : null };
}

/**
 * The engine `guard` binding: every commander passes this so AEGIS vets its
 * proposed action (fix summary + diagnosis + diff) before any deploy. Makes
 * each app self-governed, not just the COMMAND coordinator.
 */
export function aegisGuard(incident: { fixSummary: string; diagnosis: string; diff: string }) {
  const a = assessTrust(`${incident.fixSummary}\n${incident.diagnosis}\n${incident.diff}`);
  return {
    safe: a.safe,
    trustScore: a.trustScore,
    reason: a.issues.length ? a.issues.map((i) => i.type).join(', ') : 'no trust issues',
  };
}
