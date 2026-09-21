import {
  ResourceDecorator as Resource,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { DashboardEngine } from "./dashboard.engine.js";

@Injectable()
export class DashboardResources {

  //==================================================
  // Dashboard Overview
  //==================================================

  @Resource({
    uri: "dashboard://overview",
    name: "Dashboard Overview",
    description: "Returns the complete Enterprise AI-SOC dashboard.",
    mimeType: "application/json",
  })
  async overview(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving dashboard overview.");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            DashboardEngine.getDashboard(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Dashboard Metrics
  //==================================================

  @Resource({
    uri: "dashboard://metrics",
    name: "Dashboard Metrics",
    description: "Returns enterprise dashboard metrics.",
    mimeType: "application/json",
  })
  async metrics(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving dashboard metrics.");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            DashboardEngine.getMetrics(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Agents
  //==================================================

  @Resource({
    uri: "dashboard://agents",
    name: "Enterprise Agents",
    description: "Returns all enterprise AI agents.",
    mimeType: "application/json",
  })
  async agents(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving enterprise agents.");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            DashboardEngine.getAgents(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Incidents
  //==================================================

  @Resource({
    uri: "dashboard://incidents",
    name: "Security Incidents",
    description: "Returns all security incidents.",
    mimeType: "application/json",
  })
  async incidents(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving incidents.");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            DashboardEngine.getIncidents(),
            null,
            2
          ),
        },
      ],
    };

  }

  //==================================================
  // Health
  //==================================================

  @Resource({
    uri: "dashboard://health",
    name: "Dashboard Health",
    description: "Returns overall Enterprise AI-SOC health.",
    mimeType: "application/json",
  })
  async health(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info("Serving dashboard health.");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            DashboardEngine.getHealthStatus(),
            null,
            2
          ),
        },
      ],
    };

  }

}