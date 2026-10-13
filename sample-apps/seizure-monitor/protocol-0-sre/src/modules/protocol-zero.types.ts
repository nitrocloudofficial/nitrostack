import { Incident, Recommendation, AgentLog } from "./protocol-zero.data.js";

export interface AgentState {
  incident: Incident;
  engineeringReport?: {
    rootCause: string;
    engineeringHealth: number;
    riskScore: number;
    confidence: number;
    summary: string;
    affectedSystems: string[];
  };
  executiveReport?: {
    businessImpact: string;
    recommendations: Recommendation[];
    priority: "high" | "medium" | "low";
    companyHealth: number;
    approvalRequired: boolean;
  };
  logs: AgentLog[];
}

export interface NotificationLog {
  id: string;
  type: "slack" | "gmail";
  timestamp: string;
  recipient: string;
  subject: string;
  content: string;
}
