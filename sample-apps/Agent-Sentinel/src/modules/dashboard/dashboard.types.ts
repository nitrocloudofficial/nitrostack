export interface DashboardMetric {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  trend: "UP" | "DOWN" | "STABLE";
  status: "GOOD" | "WARNING" | "CRITICAL";
}

export interface AgentStatus {
  agentId: string;
  agentName: string;
  department: string;
  health: "HEALTHY" | "WARNING" | "OFFLINE";
  riskScore: number;
  lastSeen: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
  timestamp: string;
}

export interface DashboardSummary {
  totalAgents: number;
  activeAgents: number;
  blockedRequests: number;
  quarantinedAgents: number;
  averageRiskScore: number;
  policyViolations: number;
  openIncidents: number;
}

export interface DashboardSnapshot {
  generatedAt: string;
  summary: DashboardSummary;
  metrics: DashboardMetric[];
  agents: AgentStatus[];
  incidents: SecurityIncident[];
}