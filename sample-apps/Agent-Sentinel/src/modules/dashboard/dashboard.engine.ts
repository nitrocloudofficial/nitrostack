import {
  DashboardSnapshot,
  DashboardMetric,
  AgentStatus,
  SecurityIncident,
} from "./dashboard.types.js";

import {
  buildDashboardSnapshot,
  dashboardMetrics,
  enterpriseAgents,
  securityIncidents,
} from "./dashboard.data.js";

export class DashboardEngine {

  //==================================================
  // Complete Dashboard
  //==================================================

  static getDashboard(): DashboardSnapshot {

    return buildDashboardSnapshot();

  }

  //==================================================
  // Dashboard Summary
  //==================================================

  static getSummary() {

    return buildDashboardSnapshot().summary;

  }

  //==================================================
  // Metrics
  //==================================================

  static getMetrics(): DashboardMetric[] {

    return dashboardMetrics;

  }

  //==================================================
  // Metric By ID
  //==================================================

  static getMetric(
    id: string
  ): DashboardMetric | undefined {

    return dashboardMetrics.find(
      metric => metric.id === id
    );

  }

  //==================================================
  // Agents
  //==================================================

  static getAgents(): AgentStatus[] {

    return enterpriseAgents;

  }

  //==================================================
  // Agent By ID
  //==================================================

  static getAgent(
    agentId: string
  ): AgentStatus | undefined {

    return enterpriseAgents.find(
      agent => agent.agentId === agentId
    );

  }

  //==================================================
  // Healthy Agents
  //==================================================

  static getHealthyAgents(): AgentStatus[] {

    return enterpriseAgents.filter(
      agent => agent.health === "HEALTHY"
    );

  }

  //==================================================
  // Warning Agents
  //==================================================

  static getWarningAgents(): AgentStatus[] {

    return enterpriseAgents.filter(
      agent => agent.health === "WARNING"
    );

  }

  //==================================================
  // Offline Agents
  //==================================================

  static getOfflineAgents(): AgentStatus[] {

    return enterpriseAgents.filter(
      agent => agent.health === "OFFLINE"
    );

  }

  //==================================================
  // Incidents
  //==================================================

  static getIncidents(): SecurityIncident[] {

    return securityIncidents;

  }

  //==================================================
  // Incident By ID
  //==================================================

  static getIncident(
    id: string
  ): SecurityIncident | undefined {

    return securityIncidents.find(
      incident => incident.id === id
    );

  }

  //==================================================
  // Open Incidents
  //==================================================

  static getOpenIncidents(): SecurityIncident[] {

    return securityIncidents.filter(
      incident =>
        incident.status === "OPEN" ||
        incident.status === "INVESTIGATING"
    );

  }

  //==================================================
  // Resolved Incidents
  //==================================================

  static getResolvedIncidents(): SecurityIncident[] {

    return securityIncidents.filter(
      incident =>
        incident.status === "RESOLVED"
    );

  }

  //==================================================
  // Dashboard Health
  //==================================================

  static getHealthStatus() {

    const snapshot =
      buildDashboardSnapshot();

    const criticalAgents =
      snapshot.agents.filter(
        agent =>
          agent.health === "OFFLINE"
      ).length;

    const criticalIncidents =
      snapshot.incidents.filter(
        incident =>
          incident.severity === "CRITICAL" &&
          incident.status !== "RESOLVED"
      ).length;

    let status:
      | "HEALTHY"
      | "WARNING"
      | "CRITICAL";

    if (
      criticalAgents > 0 ||
      criticalIncidents > 0
    ) {

      status = "CRITICAL";

    } else if (
      snapshot.summary.averageRiskScore >= 40
    ) {

      status = "WARNING";

    } else {

      status = "HEALTHY";

    }

    return {

      timestamp: new Date().toISOString(),

      status,

      summary: snapshot.summary,

    };

  }

}