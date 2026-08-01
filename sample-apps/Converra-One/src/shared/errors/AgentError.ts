import { ApplicationError } from './ApplicationError.js';
import { AgentType } from '../enums/agent.enum.js';

export class AgentError extends ApplicationError {
  public readonly agentType: AgentType;

  constructor(message: string, agentType: AgentType, details?: Record<string, unknown>) {
    super(message, 'AGENT_EXECUTION_ERROR', 500, details);
    this.agentType = agentType;
  }
}
