import {
  AgentStatus,
  DashboardMetric,
  DashboardSnapshot,
  SecurityIncident,
} from "./dashboard.types.js";

//==================================================
// Dashboard Metrics
//==================================================

export const dashboardMetrics: DashboardMetric[] = [
  {
    id: "M-001",
    name: "Active Agents",
    value: 24,
    trend: "UP",
    status: "GOOD",
  },
  {
    id: "M-002",
    name: "Average Risk Score",
    value: 31,
    unit: "%",
    trend: "DOWN",
    status: "GOOD",
  },
  {
    id: "M-003",
    name: "Blocked Requests",
    value: 17,
    trend: "UP",
    status: "WARNING",
  },
  {
    id: "M-004",
    name: "Policy Violations",
    value: 8,
    trend: "STABLE",
    status: "WARNING",
  },
  {
    id: "M-005",
    name: "Open Incidents",
    value: 2,
    trend: "DOWN",
    status: "GOOD",
  },
  {
    id: "M-006",
    name: "Quarantined Agents",
    value: 1,
    trend: "STABLE",
    status: "CRITICAL",
  },
];

//==================================================
// Enterprise Agents
//==================================================

export const enterpriseAgents: AgentStatus[] = [
  {
    agentId: "AGENT-001",
    agentName: "Finance Copilot",
    department: "Finance",
    health: "HEALTHY",
    riskScore: 12,
    lastSeen: new Date().toISOString(),
  },
  {
    agentId: "AGENT-002",
    agentName: "HR Assistant",
    department: "HR",
    health: "HEALTHY",
    riskScore: 24,
    lastSeen: new Date().toISOString(),
  },
  {
    agentId: "AGENT-003",
    agentName: "Engineering GPT",
    department: "Engineering",
    health: "WARNING",
    riskScore: 61,
    lastSeen: new Date().toISOString(),
  },
  {
    agentId: "AGENT-004",
    agentName: "Security Analyst",
    department: "Security",
    health: "HEALTHY",
    riskScore: 15,
    lastSeen: new Date().toISOString(),
  },
  {
    agentId: "AGENT-005",
    agentName: "Sales Assistant",
    department: "Sales",
    health: "OFFLINE",
    riskScore: 82,
    lastSeen: new Date().toISOString(),
  },
];

//==================================================
// Incidents
//==================================================

export const securityIncidents: SecurityIncident[] = [
  {
    id: "INC-001",
    title: "Prompt Injection Attempt",
    severity: "HIGH",
    status: "INVESTIGATING",
    timestamp: new Date().toISOString(),
  },
  {
    id: "INC-002",
    title: "Unauthorized Tool Access",
    severity: "CRITICAL",
    status: "OPEN",
    timestamp: new Date().toISOString(),
  },
  {
    id: "INC-003",
    title: "Sensitive Data Access",
    severity: "MEDIUM",
    status: "RESOLVED",
    timestamp: new Date().toISOString(),
  },
];

//==================================================
// Snapshot Builder
//==================================================

export function buildDashboardSnapshot(): DashboardSnapshot {

  const totalAgents = enterpriseAgents.length;

  const activeAgents = enterpriseAgents.filter(
    agent => agent.health !== "OFFLINE"
  ).length;

  const blockedRequests =
    Number(
      dashboardMetrics.find(
        metric => metric.name === "Blocked Requests"
      )?.value ?? 0
    );

  const quarantinedAgents =
    Number(
      dashboardMetrics.find(
        metric => metric.name === "Quarantined Agents"
      )?.value ?? 0
    );

  const policyViolations =
    Number(
      dashboardMetrics.find(
        metric => metric.name === "Policy Violations"
      )?.value ?? 0
    );

  const averageRiskScore =
    Math.round(
      enterpriseAgents.reduce(
        (sum, agent) => sum + agent.riskScore,
        0
      ) / totalAgents
    );

  const openIncidents =
    securityIncidents.filter(
      incident => incident.status !== "RESOLVED"
    ).length;

  return {
    generatedAt: new Date().toISOString(),

    summary: {
      totalAgents,
      activeAgents,
      blockedRequests,
      quarantinedAgents,
      averageRiskScore,
      policyViolations,
      openIncidents,
    },

    metrics: dashboardMetrics,

    agents: enterpriseAgents,

    incidents: securityIncidents,
  };
}