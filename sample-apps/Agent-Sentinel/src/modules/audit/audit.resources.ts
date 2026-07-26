import {
  ResourceDecorator as Resource,
  Injectable,
  ExecutionContext,
} from "@nitrostack/core";

import { AuditEngine } from "./audit.engine.js";

@Injectable()
export class AuditResources {

  @Resource({
    uri: "audit://logs",
    name: "Audit Logs",
    description: "Returns all enterprise audit events.",
    mimeType: "application/json",
  })
  async getAuditLogs(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving audit logs");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            AuditEngine.getHistory(),
            null,
            2
          ),
        },
      ],
    };
  }

  @Resource({
    uri: "audit://statistics",
    name: "Audit Statistics",
    description: "Returns enterprise audit statistics.",
    mimeType: "application/json",
  })
  async getStatistics(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving audit statistics");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            AuditEngine.getStatistics(),
            null,
            2
          ),
        },
      ],
    };
  }

  @Resource({
    uri: "audit://incident-history",
    name: "Incident History",
    description: "Returns high-risk audit events.",
    mimeType: "application/json",
  })
  async getIncidentHistory(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving incident history");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            AuditEngine.getHighRiskEvents(),
            null,
            2
          ),
        },
      ],
    };
  }

}