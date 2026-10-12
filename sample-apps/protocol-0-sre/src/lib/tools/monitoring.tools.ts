import {
  ToolDecorator as Tool,
  Widget,
  Injectable,
  ExecutionContext,
  z,
} from "@nitrostack/core";
import { ProtocolZeroService } from "../../modules/protocol-zero.service.js";

@Injectable({ deps: [ProtocolZeroService] })
export class MonitoringTools {
  constructor(private readonly twin: ProtocolZeroService) {}

  @Tool({
    name: "startMonitoring",
    description:
      "Start continuous live polling of enterprise SaaS systems (GitHub, Jira, Datadog, Calendar) every 30 seconds.",
    inputSchema: z.object({}),
  })
  async startMonitoring(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Monitoring Agent starting live polling");
    this.twin.startMonitoring();
    return { success: true, message: "Continuous monitoring started." };
  }

  @Tool({
    name: "stopMonitoring",
    description: "Stop continuous live polling of enterprise SaaS systems.",
    inputSchema: z.object({}),
  })
  async stopMonitoring(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Monitoring Agent stopping live polling");
    this.twin.stopMonitoring();
    return { success: true, message: "Continuous monitoring stopped." };
  }

  @Tool({
    name: "getMonitoringStatus",
    description:
      "Get the active status of SaaS polling, last run timestamp, and recent Gmail/Slack alerts.",
    inputSchema: z.object({}),
  })
  @Widget("monitoring")
  async getMonitoringStatus(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Monitoring Agent fetching live status");
    return this.twin.getMonitoringStatus();
  }

  @Tool({
    name: "getSecurityAuditLogs",
    description: "Fetches recent security audit logs, including IAM role modifications, Zero-Trust Gate executions, and unauthorized access attempts.",
    inputSchema: z.object({}),
  })
  @Widget("security-audit-logs")
  async getSecurityAuditLogs(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Monitoring Agent fetching Security Audit logs...");
    const logs = await this.twin.getSecurityAuditLogs();
    return { logs };
  }
}
