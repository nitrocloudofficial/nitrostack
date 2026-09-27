import {
  analyticsSummary,
  riskTrend,
  agentHealth,
} from "./analytics.data.js";

export class AnalyticsEngine {

  async getSummary() {
    return analyticsSummary;
  }

  async getRiskTrend() {
    return riskTrend;
  }

  async getAgentHealth() {
    return agentHealth;
  }

  async getExecutiveDashboard() {

    return {

      summary: analyticsSummary,

      riskTrend,

      agents: agentHealth,

      generatedAt: new Date().toISOString(),

    };

  }

}