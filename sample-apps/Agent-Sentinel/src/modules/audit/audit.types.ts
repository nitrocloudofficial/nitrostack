export type AuditAction =
  | "DISCOVERY"
  | "RISK_ANALYSIS"
  | "PROMPT_SCAN"
  | "RESOURCE_ACCESS"
  | "POLICY_CHECK"
  | "REQUEST_APPROVED"
  | "REQUEST_BLOCKED"
  | "AGENT_QUARANTINED"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT_REPORT";

export type AuditStatus =
  | "SUCCESS"
  | "WARNING"
  | "BLOCKED"
  | "FAILED";

export interface TimelineEvent {

  timestamp: string;

  action: AuditAction;

  status: AuditStatus;

  description: string;

}

export interface AuditEvent {

  id: string;

  timestamp: string;

  agentId: string;

  agentName: string;

  department: string;

  action: AuditAction;

  status: AuditStatus;

  riskScore: number;

  decision: string;

  tool?: string;

  resource?: string;

  prompt?: string;

  ipAddress?: string;

  user?: string;

  metadata?: Record<string, unknown>;

}

export interface IncidentReport {

  incidentId: string;

  agentId: string;

  generatedAt: string;

  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  summary: string;

  timeline: TimelineEvent[];

  recommendations: string[];

}

export interface AuditStatistics {

  totalEvents: number;

  successfulEvents: number;

  warningEvents: number;

  blockedEvents: number;

  failedEvents: number;

  averageRiskScore: number;

  highestRiskScore: number;

  totalAgents: number;

}

export interface ExportReport {

  generatedAt: string;

  generatedBy: string;

  statistics: AuditStatistics;

  events: AuditEvent[];

}