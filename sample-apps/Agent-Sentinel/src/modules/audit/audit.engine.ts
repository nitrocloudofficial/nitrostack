import {
  AuditEvent,
  AuditStatistics,
  IncidentReport,
  TimelineEvent,
  AuditStatus,
} from "./audit.types.js";

import {
  auditEvents,
  calculateStatistics,
  incidentRecommendations,
} from "./audit.data.js";

export class AuditEngine {

  //--------------------------------------------------
  // Record Event
  //--------------------------------------------------

  static recordEvent(event: AuditEvent): AuditEvent {

    auditEvents.push(event);

    return event;

  }

  //--------------------------------------------------
  // Get All History
  //--------------------------------------------------

  static getHistory(): AuditEvent[] {

    return [...auditEvents].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

  }

  //--------------------------------------------------
  // Agent History
  //--------------------------------------------------

  static getAgentHistory(
    agentId: string
  ): AuditEvent[] {

    return auditEvents
      .filter(event => event.agentId === agentId)
      .sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp)
      );

  }

  //--------------------------------------------------
  // Statistics
  //--------------------------------------------------

  static getStatistics(): AuditStatistics {

    return calculateStatistics();

  }

  //--------------------------------------------------
  // Incident Report
  //--------------------------------------------------

  static generateIncidentReport(
    agentId: string
  ): IncidentReport {

    const history =
      this.getAgentHistory(agentId);

    if (history.length === 0) {

      return {

        incidentId: `INC-${Date.now()}`,

        agentId,

        generatedAt:
          new Date().toISOString(),

        severity: "LOW",

        summary:
          "No audit events found for this agent.",

        timeline: [],

        recommendations: [
          "No action required."
        ]

      };

    }

    const highestRisk = Math.max(
      ...history.map(event => event.riskScore)
    );

    const severity =
      this.calculateSeverity(highestRisk);

    const timeline: TimelineEvent[] =
      history.map(event => ({

        timestamp: event.timestamp,

        action: event.action,

        status: event.status,

        description:
          `${event.action} (${event.status})`

      }));

    return {

      incidentId:
        `INC-${Date.now()}`,

      agentId,

      generatedAt:
        new Date().toISOString(),

      severity,

      summary:
        `${history.length} audit event(s) analysed.`,

      timeline,

      recommendations:
        incidentRecommendations[severity]

    };

  }

  //--------------------------------------------------
  // Export Report
  //--------------------------------------------------

  static exportReport(
    generatedBy = "AgentSentinel"
  ) {

    return {

      generatedAt:
        new Date().toISOString(),

      generatedBy,

      statistics:
        this.getStatistics(),

      events:
        this.getHistory()

    };

  }

  //--------------------------------------------------
  // Clear Events
  //--------------------------------------------------

  static clearEvents() {

    auditEvents.length = 0;

  }

  //--------------------------------------------------
  // Severity
  //--------------------------------------------------

  private static calculateSeverity(
    score: number
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {

    if (score >= 90)
      return "CRITICAL";

    if (score >= 70)
      return "HIGH";

    if (score >= 40)
      return "MEDIUM";

    return "LOW";

  }

  //--------------------------------------------------
  // Recent Events
  //--------------------------------------------------

  static getRecentEvents(
    limit = 10
  ): AuditEvent[] {

    return this.getHistory().slice(0, limit);

  }

  //--------------------------------------------------
  // Events By Status
  //--------------------------------------------------

  static getEventsByStatus(
    status: AuditStatus
  ): AuditEvent[] {

    return auditEvents.filter(
      event => event.status === status
    );

  }

  //--------------------------------------------------
  // High Risk Events
  //--------------------------------------------------

  static getHighRiskEvents(
    threshold = 70
  ): AuditEvent[] {

    return auditEvents.filter(
      event => event.riskScore >= threshold
    );

  }

}