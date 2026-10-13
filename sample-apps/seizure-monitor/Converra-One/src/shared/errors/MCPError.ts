import { ApplicationError } from './ApplicationError.js';

export class MCPError extends ApplicationError {
  public readonly toolOrResourceName?: string;

  constructor(message: string, toolOrResourceName?: string, details?: Record<string, unknown>) {
    super(message, 'MCP_PROTOCOL_ERROR', 500, details);
    this.toolOrResourceName = toolOrResourceName;
  }
}
