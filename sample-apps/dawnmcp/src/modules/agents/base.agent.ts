import { LlmService } from '../../shared/services/llm.service.js';
import type { ChatMessage, LlmOptions } from '../../shared/interfaces/llm.interface.js';

export interface AgentTask {
  id: string;
  description: string;
  context?: Record<string, unknown>;
}

export interface AgentResult<T = unknown> {
  agentName: string;
  taskId: string;
  success: boolean;
  output: T;
  rawResponse: string;
  model: string;
}

/**
 * Base AI Agent Class
 *
 * Provides prompt assembly, system instructions, and LLM execution.
 */
export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly roleDescription: string;

  constructor(protected readonly llm: LlmService) {}

  protected async executeTask<T = string>(
    task: AgentTask,
    systemPromptSuffix?: string,
    options?: LlmOptions,
  ): Promise<AgentResult<T>> {
    const systemPrompt = [
      `You are an autonomous AI engineering agent named ${this.name}.`,
      `Role: ${this.roleDescription}`,
      systemPromptSuffix ?? '',
      'Provide clear, technical, structured output.',
    ].join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `TASK:\n${task.description}\n\nCONTEXT:\n${JSON.stringify(task.context ?? {}, null, 2)}`,
      },
    ];

    const response = await this.llm.generateResponse(messages, options);

    let output: T;
    try {
      output = JSON.parse(response.content) as T;
    } catch {
      output = response.content as unknown as T;
    }

    return {
      agentName: this.name,
      taskId: task.id,
      success: true,
      output,
      rawResponse: response.content,
      model: response.model,
    };
  }
}
