export enum VerdictType {
  APPROVED = "APPROVED",
  CONDITIONAL_APPROVAL = "CONDITIONAL_APPROVAL",
  HARD_VETO = "HARD_VETO"
}

export enum SOPCategory {
  BUDGET = "BUDGET",
  SECURITY = "SECURITY",
  OPERATIONAL_BLAST_RADIUS = "OPERATIONAL_BLAST_RADIUS",
  COMPLIANCE = "COMPLIANCE"
}

export interface Evidence {
  id: string;
  description: string;
  source: string;
  confidence_score: number; // 0.0 to 1.0
  metadata?: Record<string, any>;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposed_by: string;
  parameters: Record<string, any>;
  evidences?: Evidence[];
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface CounterArgument {
  agent_id: string;
  challenge_summary: string;
  missing_evidences: string[];
  counter_claims: string[];
  renegotiation_required: boolean;
  risk_score: number; // 0.0 to 1.0
}

export interface IncidentReport {
  id: string;
  title: string;
  domain: string;
  description: string;
  outcome: string;
  risk_score: number;
  lessons_learned: string[];
  tags: string[];
}

export interface SOPRule {
  rule_id: string;
  name: string;
  category: SOPCategory;
  max_threshold?: number;
  min_threshold?: number;
  prohibited_actions?: string[];
  remediation_advice: string;
}

export interface SafetyVerdict {
  verdict: VerdictType;
  violated_rules: string[];
  remediation_required: string[];
  details: string;
}

export interface NegotiationRound {
  round_number: number;
  proposal: Proposal;
  counter_argument?: CounterArgument;
  retrieved_incidents?: IncidentReport[];
  safety_verdict?: SafetyVerdict;
  status: "PENDING" | "CHALLENGED" | "VETOED" | "REVISED" | "RESOLVED";
}
