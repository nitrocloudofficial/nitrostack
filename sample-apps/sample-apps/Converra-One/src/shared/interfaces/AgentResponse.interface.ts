import { AgentType } from '../enums/agent.enum.js';

export interface AgentResponse<T = unknown> {
  agentType: AgentType;
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  executionTimeMs: number;
  timestamp: Date;
}
