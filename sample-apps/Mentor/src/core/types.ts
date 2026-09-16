/**
 * Shared, framework-free types for the COMMAND platform's engine core.
 *
 * These have ZERO NitroStack dependency on purpose: every one of the five MCP
 * apps (SENTINEL, LEDGER, AEGIS, VERDICT, RELAY) imports this same core, and
 * each domain is "core + one adapter". Keeping the core pure keeps it testable
 * and reusable across all five deployables.
 */

/** Outcome of one agent tool call; `data` is what returns to the model. */
export interface ToolResult {
  data: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Adapter-normalised risk signal for the autonomy gate, already scaled to
 * [0, 1] (1 = smallest/safest change) plus a human-readable reason.
 * DevOps scores by files/lines; FinOps by resources/$ — different units, one
 * contract. This is what lets a single gate serve every domain.
 */
export interface BlastRadius {
  score: number;
  reason: string;
}

/** One weighted, explained input to the confidence score. */
export interface VerdictComponent {
  score: number;
  weight: number;
  reason: string;
}

/** The autonomy gate's full, auditable output. */
export interface Verdict {
  score: number;
  threshold: number;
  autonomous: boolean;
  components: Record<string, VerdictComponent>;
}

/** The lifecycle an incident moves through, identical across all domains. */
export type IncidentStatus =
  | 'DETECTED'
  | 'DIAGNOSING'
  | 'VERIFYING'
  | 'AWAITING_APPROVAL'
  | 'DEPLOYING'
  | 'REPORTING'
  | 'RESOLVED'
  | 'ESCALATED';

/** The domain-agnostic record the engine produces and mutates for one incident. */
export interface Incident {
  id: string;
  symptom: string;
  domain: string;
  status: IncidentStatus;
  diagnosis: string;
  fixSummary: string;
  diff: string;
  iterations: number;
  verdict: Verdict | null;
  actions: Array<Record<string, unknown>>;
  approvalNote: string;
  openedAt: number;
  closedAt: number | null;
}
