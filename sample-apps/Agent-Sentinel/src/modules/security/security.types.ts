export type AgentStatus =
  | "ACTIVE"
  | "QUARANTINED";

export type RiskSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type Decision =
  | "ALLOW"
  | "WARN"
  | "BLOCK"
  | "QUARANTINE";

export interface RiskViolation {

  code: string;

  title: string;

  description: string;

  score: number;

}

export interface RiskAssessment {

  agentId: string;

  agentName: string;

  timestamp: string;

  riskScore: number;

  severity: RiskSeverity;

  decision: Decision;

  violations: RiskViolation[];

  recommendations: string[];

}

export interface SecurityPolicy {

  id: string;

  name: string;

  description: string;

  enabled: boolean;

  threshold: number;

}

export interface PromptScanResult {

  prompt: string;

  suspicious: boolean;

  score: number;

  findings: string[];

}

export interface AgentSecurityProfile {

  id: string;

  name: string;

  status: AgentStatus;

  permissions: string[];

  department: string;

  lastSeen: string;

}