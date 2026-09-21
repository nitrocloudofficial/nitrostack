// shared-types.ts — identical on the dashboard and the MCP server.
// This is the seam. Do not rename fields or change casing.

export type Dimension = "identity" | "location" | "digital_presence" | "document_integrity";

export interface Evidence {
  id: string;
  source: string;          // e.g. "State Business Registry", "Google Street View", "Utility Bill OCR"
  snippet: string;
  retrievedAt: string;     // ISO timestamp
  reliability: number;     // 0-1
  relation: "supports" | "contradicts" | "missing";
}

export interface Claim {
  id: string;
  dimension: Dimension;
  label: string;            // "Registered address"
  value: string;            // "42 MG Road, Bengaluru"
  status: "verified" | "contradicted" | "pending";
  evidence: Evidence[];
}

export interface DimensionScore {
  dimension: Dimension;
  score: number;             // 0-100
  driver: string;            // one-line explanation
}

export type Recommendation = "proceed" | "request_evidence" | "escalate" | "flag_insufficient";

export interface TraceEvent {
  timestamp: string;
  agent: "orchestrator" | "evidence_challenger" | "risk_arbiter";
  message: string;
}

export interface Case {
  id: string;
  businessName: string;
  submittedAt: string;
  status: "new" | "investigating" | "needs_review" | "escalated" | "cleared";
  overallScore: number;
  dimensionScores: DimensionScore[];
  claims: Claim[];
  recommendation: Recommendation;
  recommendationReason: string;
  missingEvidence: string[];
  trace: TraceEvent[];
}

// Backend-only, not needed by the dashboard:
export interface ToolResult<T = unknown> {
  status: "success" | "failed" | "timeout";
  error?: string;
  data?: T;
  
  // Legacy fields (to be phased out or updated)
  ok?: boolean;
  source?: string;
  matchesClaim?: boolean;
  confidence?: number;
  retrievedAt?: string;
}

export interface CaseState {
  caseId: string;
  businessName: string;
  claims: Claim[];
  rawToolResults: ToolResult[];
  createdAt: string;
  updatedAt: string;
}
