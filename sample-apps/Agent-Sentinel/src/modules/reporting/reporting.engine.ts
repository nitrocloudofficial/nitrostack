import { EnterpriseReport } from "./reporting.types.js";

import {
  sampleReports,
  buildReport,
} from "./reporting.data.js";

export class ReportingEngine {

  //==================================================
  // All Reports
  //==================================================

  static getReports(): EnterpriseReport[] {

    return sampleReports;

  }

  //==================================================
  // Report By ID
  //==================================================

  static getReport(
    id: string
  ): EnterpriseReport | undefined {

    return sampleReports.find(
      report => report.metadata.id === id
    );

  }

  //==================================================
  // Executive Report
  //==================================================

  static generateExecutiveReport(): EnterpriseReport {

    return buildReport(
      "REP-EXEC",
      "Executive AI Security Report",
      "EXECUTIVE"
    );

  }

  //==================================================
  // Security Report
  //==================================================

  static generateSecurityReport(): EnterpriseReport {

    return buildReport(
      "REP-SEC",
      "Security Operations Report",
      "SECURITY"
    );

  }

  //==================================================
  // Audit Report
  //==================================================

  static generateAuditReport(): EnterpriseReport {

    return buildReport(
      "REP-AUD",
      "Enterprise Audit Report",
      "AUDIT"
    );

  }

  //==================================================
  // Policy Report
  //==================================================

  static generatePolicyReport(): EnterpriseReport {

    return buildReport(
      "REP-POL",
      "Enterprise Policy Compliance Report",
      "POLICY"
    );

  }

  //==================================================
  // Agent Report
  //==================================================

  static generateAgentReport(): EnterpriseReport {

    return buildReport(
      "REP-AGT",
      "Enterprise AI Agent Report",
      "AGENTS"
    );

  }

  //==================================================
  // Incident Report
  //==================================================

  static generateIncidentReport(): EnterpriseReport {

    return buildReport(
      "REP-INC",
      "Security Incident Report",
      "INCIDENTS"
    );

  }

  //==================================================
  // Export Report
  //==================================================

  static exportReport(
    id: string,
    format: "JSON" | "CSV" | "PDF"
  ) {

    const report = this.getReport(id);

    if (!report) {

      return {
        success: false,
        message: "Report not found.",
      };

    }

    return {

      success: true,

      exportedAt: new Date().toISOString(),

      format,

      report: {

        ...report,

        metadata: {

          ...report.metadata,

          format,

        },

      },

    };

  }

  //==================================================
  // Statistics
  //==================================================

  static getStatistics() {

    return {

      totalReports: sampleReports.length,

      executiveReports:
        sampleReports.filter(
          report =>
            report.metadata.type === "EXECUTIVE"
        ).length,

      securityReports:
        sampleReports.filter(
          report =>
            report.metadata.type === "SECURITY"
        ).length,

      auditReports:
        sampleReports.filter(
          report =>
            report.metadata.type === "AUDIT"
        ).length,

      policyReports:
        sampleReports.filter(
          report =>
            report.metadata.type === "POLICY"
        ).length,

      generatedAt:
        new Date().toISOString(),

    };

  }

}