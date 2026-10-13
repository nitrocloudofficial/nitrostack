import { AgentType } from '../enums/agent.enum.js';
import { AgentResponse } from '../interfaces/AgentResponse.interface.js';

/**
 * Base Abstract Class for all Converra One AI Agents
 */
export abstract class BaseAgent<TInput = unknown, TOutput = unknown> {
  public abstract readonly name: string;
  public abstract readonly type: AgentType;
  public abstract readonly description: string;

  /**
   * Execute agent logic with generic input payload
   */
  public abstract execute(input: TInput): Promise<AgentResponse<TOutput>>;

  /**
   * Helper to format standardized agent responses
   */
  protected createSuccessResponse(data: TOutput, executionTimeMs: number, message: string = 'Execution successful'): AgentResponse<TOutput> {
    return {
      agentType: this.type,
      success: true,
      message,
      data,
      executionTimeMs,
      timestamp: new Date()
    };
  }

  /**
   * Helper to format standardized error responses
   */
  protected createErrorResponse(error: string, executionTimeMs: number): AgentResponse<TOutput> {
    return {
      agentType: this.type,
      success: false,
      message: 'Execution failed',
      error,
      executionTimeMs,
      timestamp: new Date()
    };
  }
}
