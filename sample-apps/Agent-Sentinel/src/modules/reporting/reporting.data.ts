import {
  EnterpriseReport,
  ReportSummary,
} from "./reporting.types.js";

//==================================================
// Report Recommendations
//==================================================

export const reportRecommendations: Record<string, string[]> = {

  EXECUTIVE: [
    "Review enterprise AI governance policies.",
    "Reduce average enterprise risk score.",
    "Increase AI agent monitoring coverage.",
    "Perform quarterly compliance audits.",
  ],

  SECURITY: [
    "Investigate all critical incidents.",
    "Review blocked MCP requests.",
    "Rotate compromised credentials.",
    "Audit privileged AI agents.",
  ],

  AUDIT: [
    "Review audit history weekly.",
    "Validate audit log integrity.",
    "Archive completed investigations.",
  ],

  POLICY: [
    "Review disabled policies.",
    "Update prompt injection rules.",
    "Strengthen access control policies.",
  ],

  AGENTS: [
    "Remove inactive AI agents.",
    "Review high-risk agents.",
    "Validate agent permissions.",
  ],

  INCIDENTS: [
    "Resolve critical incidents immediately.",
    "Document root causes.",
    "Update incident playbooks.",
  ],

};

//==================================================
// Default Summary
//==================================================

export const defaultSummary: ReportSummary = {

  totalAgents: 24,

  activeAgents: 22,

  policyViolations: 8,

  blockedRequests: 17,

  quarantinedAgents: 1,

  incidents: 2,

  averageRiskScore: 31,

};

//==================================================
// Sample Reports
//==================================================

export const sampleReports: EnterpriseReport[] = [

  {

    metadata: {

      id: "REP-001",

      title: "Executive AI Security Report",

      type: "EXECUTIVE",

      format: "JSON",

      generatedAt: new Date().toISOString(),

      generatedBy: "AgentSentinel",

    },

    summary: defaultSummary,

    recommendations:
      reportRecommendations.EXECUTIVE,

    data: {

      status: "Healthy",

      compliance: "97%",

      monitoredAgents: 24,

    },

  },

  {

    metadata: {

      id: "REP-002",

      title: "Security Operations Report",

      type: "SECURITY",

      format: "JSON",

      generatedAt: new Date().toISOString(),

      generatedBy: "AgentSentinel",

    },

    summary: defaultSummary,

    recommendations:
      reportRecommendations.SECURITY,

    data: {

      criticalIncidents: 1,

      blockedRequests: 17,

      quarantinedAgents: 1,

    },

  },

];

//==================================================
// Report Factory
//==================================================

export function buildReport(

  id: string,

  title: string,

  type:
    | "EXECUTIVE"
    | "SECURITY"
    | "AUDIT"
    | "POLICY"
    | "AGENTS"
    | "INCIDENTS"

): EnterpriseReport {

  return {

    metadata: {

      id,

      title,

      type,

      format: "JSON",

      generatedAt:
        new Date().toISOString(),

      generatedBy:
        "AgentSentinel",

    },

    summary:
      defaultSummary,

    recommendations:
      reportRecommendations[type],

    data: {

      message:
        `${title} generated successfully.`

    }

  };

}