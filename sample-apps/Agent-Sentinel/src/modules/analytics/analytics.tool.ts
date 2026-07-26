import {
  ToolDecorator as Tool,
  z,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { AnalyticsEngine } from "./analytics.engine.js";

@Injectable()
export class AnalyticsTools {
  constructor(private readonly engine: AnalyticsEngine) {}

  @Tool({
    name: "get_analytics_summary",
    description: "Returns analytics summary for the enterprise.",
    inputSchema: z.object({}),
  })
  async getAnalyticsSummary(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching analytics summary");

    return await this.engine.getSummary();
  }

  @Tool({
    name: "get_risk_trend",
    description: "Returns enterprise risk trend.",
    inputSchema: z.object({}),
  })
  async getRiskTrend(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching risk trend");

    return await this.engine.getRiskTrend();
  }

  @Tool({
    name: "get_agent_health",
    description: "Returns health status of AI agents.",
    inputSchema: z.object({}),
  })
  async getAgentHealth(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching agent health");

    return await this.engine.getAgentHealth();
  }

  @Tool({
    name: "get_executive_dashboard",
    description: "Returns executive dashboard analytics.",
    inputSchema: z.object({}),
  })
  async getExecutiveDashboard(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching executive dashboard");

    return await this.engine.getExecutiveDashboard();
  }
}