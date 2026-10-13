import type {
  AnalyticsSummary,
  RiskTrend,
  AgentHealth
} from "./analytics.types.js";

export const analyticsSummary: AnalyticsSummary = {

  securityScore: 92,

  complianceScore: 96,

  trustScore: 94,

  riskScore: 18,

  activeAgents: 8,

  activeIncidents: 2,

  healthyConnectors: 4

};

export const riskTrend: RiskTrend[] = [

  { day: "Mon", score: 40 },

  { day: "Tue", score: 33 },

  { day: "Wed", score: 27 },

  { day: "Thu", score: 24 },

  { day: "Fri", score: 18 }

];

export const agentHealth: AgentHealth[] = [

  {

    id: "A-101",

    name: "Finance Agent",

    health: 96

  },

  {

    id: "A-102",

    name: "HR Agent",

    health: 89

  },

  {

    id: "A-103",

    name: "Security Agent",

    health: 98

  }

];