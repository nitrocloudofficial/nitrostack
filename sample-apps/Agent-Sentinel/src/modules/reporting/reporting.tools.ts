import {
  ToolDecorator as Tool,
  z,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { ReportingEngine } from "./reporting.engine.js";

@Injectable()
export class ReportingTools {

  //==================================================
  // Executive Report
  //==================================================

  @Tool({
    name: "generate_executive_report",
    description: "Generate the Executive AI Security Report.",
    inputSchema: z.object({}),
  })
  async generateExecutiveReport(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Generating Executive Report");

    return ReportingEngine.generateExecutiveReport();

  }

  //==================================================
  // Security Report
  //==================================================

  @Tool({
    name: "generate_security_report",
    description: "Generate the Security Operations Report.",
    inputSchema: z.object({}),
  })
  async generateSecurityReport(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Generating Security Report");

    return ReportingEngine.generateSecurityReport();

  }

  //==================================================
  // Audit Report
  //==================================================

  @Tool({
    name: "generate_audit_report",
    description: "Generate the Enterprise Audit Report.",
    inputSchema: z.object({}),
  })
  async generateAuditReport(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Generating Audit Report");

    return ReportingEngine.generateAuditReport();

  }

  //==================================================
  // Policy Report
  //==================================================

  @Tool({
    name: "generate_policy_report",
    description: "Generate the Policy Compliance Report.",
    inputSchema: z.object({}),
  })
  async generatePolicyReport(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Generating Policy Report");

    return ReportingEngine.generatePolicyReport();

  }

  //==================================================
  // Agent Report
  //==================================================

  @Tool({
    name: "generate_agent_report",
    description: "Generate the Enterprise AI Agent Report.",
    inputSchema: z.object({}),
  })
  async generateAgentReport(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Generating Agent Report");

    return ReportingEngine.generateAgentReport();

  }

  //==================================================
  // Incident Report
  //==================================================

  @Tool({
    name: "generate_incident_report",
    description: "Generate the Enterprise Incident Report.",
    inputSchema: z.object({}),
  })
  async generateIncidentReport(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Generating Incident Report");

    return ReportingEngine.generateIncidentReport();

  }

  //==================================================
  // Get Reports
  //==================================================

  @Tool({
    name: "get_reports",
    description: "Return all generated enterprise reports.",
    inputSchema: z.object({}),
  })
  async getReports(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Fetching reports");

    return ReportingEngine.getReports();

  }

  //==================================================
  // Get Report
  //==================================================

  @Tool({
    name: "get_report",
    description: "Return a report by its ID.",
    inputSchema: z.object({
      id: z.string().describe("Report ID"),
    }),
  })
  async getReport(
    input: {
      id: string;
    },
    context: ExecutionContext
  ) {

    context.logger.info(`Fetching report ${input.id}`);

    const report =
      ReportingEngine.getReport(input.id);

    if (!report) {

      return {

        success: false,

        message: "Report not found."

      };

    }

    return {

      success: true,

      report,

    };

  }

  //==================================================
  // Export Report
  //==================================================

  @Tool({
    name: "export_report",
    description: "Export a report in JSON, CSV or PDF format.",
    inputSchema: z.object({
      id: z.string().describe("Report ID"),
      format: z.enum([
        "JSON",
        "CSV",
        "PDF",
      ]),
    }),
  })
  async exportReport(
    input: {
      id: string;
      format: "JSON" | "CSV" | "PDF";
    },
    context: ExecutionContext
  ) {

    context.logger.info(
      `Exporting report ${input.id} (${input.format})`
    );

    return ReportingEngine.exportReport(
      input.id,
      input.format
    );

  }

  //==================================================
  // Statistics
  //==================================================

  @Tool({
    name: "report_statistics",
    description: "Return reporting statistics.",
    inputSchema: z.object({}),
  })
  async reportStatistics(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info(
      "Fetching reporting statistics"
    );

    return ReportingEngine.getStatistics();

  }

}