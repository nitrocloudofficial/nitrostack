/**
 * Local copy of @trademind/shared-types — only the pieces the 6 MCP tool
 * modules actually depend on (AgentResult + AgentType). Kept as a single
 * file so this repo has zero workspace/package dependencies on the rest
 * of the trademind monorepo.
 */

export type AgentType =
  | "portfolio"
  | "market"
  | "risk"
  | "reconciliation"
  | "compliance"
  | "communication"
  | "challenger"
  | "calibration";

export interface ChallengerResult {
  verdict: "approve" | "request_re-analysis";
  reasoning: string;
  feedback?: string;
  retry_count: number;
}

export interface AgentResult<TData = Record<string, unknown>> {
  id: string;
  workflow_id: string;
  agent_type: AgentType;
  result_data: TData;
  confidence_score: number; // 0-1
  challenged: boolean;
  challenger_result: ChallengerResult | null;
  needs_human_review?: boolean;
  created_at: string; // ISO timestamp
}
