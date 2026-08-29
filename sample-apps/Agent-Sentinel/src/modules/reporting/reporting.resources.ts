import {
  ResourceDecorator as Resource,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { ReportingEngine } from "./reporting.engine.js";

@Injectable()
export class ReportingResources {

  //==================================================
  // Executive Report
  //==================================================

  @Resource({
    uri: "report://executive",
    name: "Executive Report",
    description: "Enterprise Executive AI Security Report",
    mimeType: "application/json",
  })
  async executive(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Executive Report");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            ReportingEngine.generateExecutiveReport(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Security Report
  //==================================================

  @Resource({
    uri: "report://security",
    name: "Security Report",
    description: "Enterprise Security Operations Report",
    mimeType: "application/json",
  })
  async security(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Security Report");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            ReportingEngine.generateSecurityReport(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Audit Report
  //==================================================

  @Resource({
    uri: "report://audit",
    name: "Audit Report",
    description: "Enterprise Audit Report",
    mimeType: "application/json",
  })
  async audit(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Audit Report");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            ReportingEngine.generateAuditReport(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Policy Report
  //==================================================

  @Resource({
    uri: "report://policy",
    name: "Policy Report",
    description: "Enterprise Policy Compliance Report",
    mimeType: "application/json",
  })
  async policy(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Policy Report");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            ReportingEngine.generatePolicyReport(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Agent Report
  //==================================================

  @Resource({
    uri: "report://agents",
    name: "Agent Report",
    description: "Enterprise AI Agent Report",
    mimeType: "application/json",
  })
  async agents(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Agent Report");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            ReportingEngine.generateAgentReport(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Incident Report
  //==================================================

  @Resource({
    uri: "report://incidents",
    name: "Incident Report",
    description: "Enterprise Security Incident Report",
    mimeType: "application/json",
  })
  async incidents(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Incident Report");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            ReportingEngine.generateIncidentReport(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Statistics
  //==================================================

  @Resource({
    uri: "report://statistics",
    name: "Reporting Statistics",
    description: "Enterprise reporting statistics",
    mimeType: "application/json",
  })
  async statistics(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving Reporting Statistics");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            ReportingEngine.getStatistics(),
            null,
            2
          ),
        },
      ],
    };

  }

}