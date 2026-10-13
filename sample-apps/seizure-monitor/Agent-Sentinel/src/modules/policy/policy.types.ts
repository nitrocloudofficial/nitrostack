export type PolicyDecision =
  | "ALLOW"
  | "WARN"
  | "BLOCK"
  | "QUARANTINE";

export type PolicySeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type PolicyType =
  | "IDENTITY"
  | "PROMPT"
  | "TOOL"
  | "RESOURCE"
  | "COMPLIANCE"
  | "TIME"
  | "DEPARTMENT";

export interface PolicyRule {

  id: string;

  name: string;

  type: PolicyType;

  description: string;

  enabled: boolean;

  severity: PolicySeverity;

  decision: PolicyDecision;

  condition: string;

}

export interface PolicyViolation {

  ruleId: string;

  ruleName: string;

  severity: PolicySeverity;

  message: string;

}

export interface PolicyEvaluation {

  agentId: string;

  agentName: string;

  timestamp: string;

  decision: PolicyDecision;

  score: number;

  violations: PolicyViolation[];

  recommendations: string[];

}

export interface PolicyRequest {

  agentId: string;

  agentName: string;

  department: string;

  prompt: string;

  permissions: string[];

  tools: string[];

  resource?: string;

  time?: string;

}

export interface PolicyStatistics {

  totalPolicies: number;

  enabledPolicies: number;

  disabledPolicies: number;

  criticalPolicies: number;

}