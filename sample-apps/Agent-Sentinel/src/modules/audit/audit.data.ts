import {
  AuditEvent,
  AuditStatistics,
} from "./audit.types.js";

/**
 * Enterprise In-Memory Audit Store
 *
 * Later this entire file can be replaced
 * with PostgreSQL without changing the
 * Audit Engine.
 */

export const auditEvents: AuditEvent[] = [];

/**
 * Standard enterprise recommendations
 */

export const incidentRecommendations = {

  LOW: [

    "Continue monitoring the agent.",

    "No immediate action required."

  ],

  MEDIUM: [

    "Review recent activity.",

    "Verify requested permissions.",

    "Notify the system administrator."

  ],

  HIGH: [

    "Investigate agent behaviour immediately.",

    "Review all recent prompts.",

    "Restrict high-risk permissions."

  ],

  CRITICAL: [

    "Quarantine the AI agent.",

    "Block all active requests.",

    "Perform a complete forensic investigation.",

    "Notify security operations immediately."

  ]

};

/**
 * Statistics helper
 */

export function calculateStatistics(): AuditStatistics {

  const totalEvents = auditEvents.length;

  const successfulEvents =
    auditEvents.filter(
      e => e.status === "SUCCESS"
    ).length;

  const warningEvents =
    auditEvents.filter(
      e => e.status === "WARNING"
    ).length;

  const blockedEvents =
    auditEvents.filter(
      e => e.status === "BLOCKED"
    ).length;

  const failedEvents =
    auditEvents.filter(
      e => e.status === "FAILED"
    ).length;

  const highestRiskScore =
    totalEvents === 0
      ? 0
      : Math.max(
          ...auditEvents.map(
            e => e.riskScore
          )
        );

  const averageRiskScore =
    totalEvents === 0
      ? 0
      : Number(
          (
            auditEvents.reduce(
              (sum, e) => sum + e.riskScore,
              0
            ) / totalEvents
          ).toFixed(2)
        );

  const totalAgents =
    new Set(
      auditEvents.map(
        e => e.agentId
      )
    ).size;

  return {

    totalEvents,

    successfulEvents,

    warningEvents,

    blockedEvents,

    failedEvents,

    averageRiskScore,

    highestRiskScore,

    totalAgents,

  };

}