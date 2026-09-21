import {
  ToolDecorator as Tool,
  z,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { DashboardEngine } from "./dashboard.engine.js";
import { AnalyticsEngine } from "../analytics/analytics.engine.js";
import { NotificationsEngine } from "../notifications/notifications.engine.js";
import { ConnectorsEngine } from "../connectors/connectors.engine.js";

@Injectable()
export class DashboardTools {
  private readonly analytics = new AnalyticsEngine();

  private readonly notifications = new NotificationsEngine();

  private readonly connectors = new ConnectorsEngine();
  @Tool({
    name: "get_dashboard",
    description: "Returns the complete Enterprise AI-SOC dashboard.",
    inputSchema: z.object({}),
  })
  async getDashboard(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching dashboard");

    return DashboardEngine.getDashboard();
  }

  @Tool({
    name: "get_dashboard_summary",
    description: "Returns dashboard summary.",
    inputSchema: z.object({}),
  })
  async getDashboardSummary(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching dashboard summary");

    return DashboardEngine.getSummary();
  }

  @Tool({
    name: "get_dashboard_metrics",
    description: "Returns dashboard metrics.",
    inputSchema: z.object({}),
  })
  async getDashboardMetrics(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching dashboard metrics");

    return DashboardEngine.getMetrics();
  }

  @Tool({
    name: "get_dashboard_health",
    description: "Returns dashboard health.",
    inputSchema: z.object({}),
  })
  async getDashboardHealth(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching dashboard health");

    return DashboardEngine.getHealthStatus();
  }

  @Tool({
    name: "get_agents",
    description: "Returns all enterprise AI agents.",
    inputSchema: z.object({}),
  })
  async getAgents(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching agents");

    return DashboardEngine.getAgents();
  }

  @Tool({
    name: "get_agent",
    description: "Returns a single enterprise AI agent.",
    inputSchema: z.object({
      agentId: z.string().describe("Agent ID"),
    }),
  })
  async getAgent(
    input: {
      agentId: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info(`Fetching ${input.agentId}`);

    const agent = DashboardEngine.getAgent(input.agentId);

    if (!agent) {
      return {
        success: false,
        message: "Agent not found.",
      };
    }

    return {
      success: true,
      agent,
    };
  }

  @Tool({
    name: "get_incidents",
    description: "Returns all security incidents.",
    inputSchema: z.object({}),
  })
  async getIncidents(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching incidents");

    return DashboardEngine.getIncidents();
  }

  @Tool({
    name: "get_incident",
    description: "Returns a security incident.",
    inputSchema: z.object({
      id: z.string().describe("Incident ID"),
    }),
  })
  async getIncident(
    input: {
      id: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info(`Fetching incident ${input.id}`);

    const incident = DashboardEngine.getIncident(input.id);

    if (!incident) {
      return {
        success: false,
        message: "Incident not found.",
      };
    }

    return {
      success: true,
      incident,
    };
  }

  @Tool({
    name: "get_open_incidents",
    description: "Returns all open incidents.",
    inputSchema: z.object({}),
  })
  async getOpenIncidents(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching open incidents");

    return DashboardEngine.getOpenIncidents();
  }

  @Tool({
    name: "get_resolved_incidents",
    description: "Returns all resolved incidents.",
    inputSchema: z.object({}),
  })
  async getResolvedIncidents(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching resolved incidents");

    return DashboardEngine.getResolvedIncidents();
  }
  @Tool({
  name: "get_soc_dashboard",
  description: "Returns the complete live Enterprise AI Security Operations Center dashboard.",
  inputSchema: z.object({}),
})
async getSocDashboard(
  input: {},
  context: ExecutionContext
) {
  context.logger.info("Building SOC Dashboard");

  const [
    analytics,
    riskTrend,
    agentHealth,
    executive,
    connectors,
    connectorHealth,
    notifications,
    notificationSummary,
  ] = await Promise.all([
    this.analytics.getSummary(),
    this.analytics.getRiskTrend(),
    this.analytics.getAgentHealth(),
    this.analytics.getExecutiveDashboard(),
    this.connectors.getConnectors(),
    this.connectors.getOverallHealth(),
    this.notifications.getNotifications(),
    this.notifications.getNotificationSummary(),
  ]);

  return {
    generatedAt: new Date().toISOString(),

    analytics,

    riskTrend,

    agentHealth,

    executive,

    connectors: {
      overallHealth: connectorHealth,
      items: connectors,
    },

    notifications: {
      summary: notificationSummary,
      items: notifications,
    },

    dashboard: DashboardEngine.getDashboard(),

    metrics: DashboardEngine.getMetrics(),

    health: DashboardEngine.getHealthStatus(),

    agents: DashboardEngine.getAgents(),

    incidents: DashboardEngine.getOpenIncidents(),
  };
}

}