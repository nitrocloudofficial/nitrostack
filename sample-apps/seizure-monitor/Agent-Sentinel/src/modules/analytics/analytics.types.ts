export interface AnalyticsSummary {

  securityScore: number;

  complianceScore: number;

  trustScore: number;

  riskScore: number;

  activeAgents: number;

  activeIncidents: number;

  healthyConnectors: number;

}

export interface RiskTrend {

  day: string;

  score: number;

}

export interface AgentHealth {

  id: string;

  name: string;

  health: number;

}