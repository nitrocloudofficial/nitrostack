export type Severity = "low" | "medium" | "high";
export type Confidence = "low" | "medium" | "high";
export type FindingType = "contradiction" | "disappearance";

/** How a finding was flagged — surfaced so every finding is explainable. */
export type DetectionMethod =
  | "numeric-value-conflict" // deterministic: same-topic clauses with differing numbers
  | "cross-version-semantic" // an obligation's wording materially changed between versions
  | "semantic-llm" // LLM judged two clauses contradictory
  | "category-removed"; // an obligation category present in an older version is gone entirely

export interface Doc {
  id: string;
  title: string;
  docType: string;
  version: string;
  accessTier: string;
  content: string;
  createdAt: string;
  seq: number; // monotonic ingestion order — the source of truth for version ordering
  previousDocumentId: string | null;
}

export interface Finding {
  id: string;
  auditId: string;
  type: FindingType;
  docIds: string[];
  explanation: string;
  severity: Severity;
  confidence: Confidence;
  severityJustification: string;
  detectionMethod: DetectionMethod;
  createdAt: string;
}

export interface Audit {
  id: string;
  docIds: string[];
  status: "pending" | "running" | "complete" | "failed";
  findingIds: string[];
  createdAt: string;
  completedAt: string | null;
  progressDone: number;
  progressTotal: number;
  error: string | null;
}

/** A single cryptographically-chained entry in the Black Box ledger. */
export interface DecisionRecord {
  id: string;
  auditId: string;
  findingId: string | null;
  agentName: string;
  input: unknown;
  output: unknown;
  timestamp: string;
  prevHash: string; // "GENESIS" for the first record in a chain
  hash: string;
}

export interface ReplayResult {
  auditId: string;
  findingId: string | null;
  records: DecisionRecord[];
  verified: boolean;
  brokenAt: string | null;
}
