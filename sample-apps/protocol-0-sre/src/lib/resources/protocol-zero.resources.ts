import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";
import { ProtocolZeroService } from "../../modules/protocol-zero.service.js";
import { Injectable } from "@nitrostack/core";

@Injectable({ deps: [ProtocolZeroService] })
export class ProtocolZeroResources {
  constructor(private readonly service: ProtocolZeroService) {}

  @Resource({
    name: "datadog-alerts",
    uri: "datadog://alerts/latest",
    description:
      "Fetch the latest critical Datadog alerts and CPU/Memory metrics",
    mimeType: "application/json",
  })
  async getDatadogAlerts(ctx: ExecutionContext) {
    const status = this.service.getMonitoringStatus();
    return JSON.stringify({
      cpu_failures: status.datadogHttpCheckFailures,
      timestamp: status.lastPollTimestamp,
    });
  }

  @Resource({
    name: "github-actions-failed",
    uri: "github://actions/failed",
    description: "Fetch the latest failed GitHub Actions workflows",
    mimeType: "application/json",
  })
  async getFailedWorkflows(ctx: ExecutionContext) {
    const status = this.service.getMonitoringStatus();
    return JSON.stringify({
      runs: status.githubRunsCount,
      timestamp: status.lastPollTimestamp,
    });
  }

  @Resource({
    name: "jira-sprints-active",
    uri: "jira://sprints/active",
    description: "Fetch active Jira sprints and story point burndown metrics",
    mimeType: "application/json",
  })
  async getJiraSprints(ctx: ExecutionContext) {
    const status = this.service.getMonitoringStatus();
    return JSON.stringify({
      sprints: status.jiraSprintsCount,
      timestamp: status.lastPollTimestamp,
    });
  }

  @Resource({
    name: "slack-ops-history",
    uri: "slack://ops-channel/history",
    description:
      "Fetch the latest incident notifications sent to the ops Slack channel",
    mimeType: "application/json",
  })
  async getSlackHistory(ctx: ExecutionContext) {
    const status = this.service.getMonitoringStatus();
    return JSON.stringify(
      status.recentNotifications.filter((n) => n.type === "slack"),
    );
  }

  @Resource({
    name: "audit-trail",
    uri: "protocol-zero://audit-trail",
    description:
      "Fetch the tamper-evident, PII-redacted audit trail of all agent actions",
    mimeType: "application/json",
  })
  async getAuditTrail(ctx: ExecutionContext) {
    const status = this.service.getMonitoringStatus();
    return JSON.stringify(status.recentNotifications);
  }
}
