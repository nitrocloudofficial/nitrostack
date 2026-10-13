import { Injectable } from '@nitrostack/core';
import { BaseAgent, AgentTask, AgentResult } from './base.agent.js';
import { LlmService } from '../../shared/services/llm.service.js';

@Injectable()
export class ExecutorAgent extends BaseAgent {
  readonly name = 'ExecutorAgent';
  readonly roleDescription = 'Code execution & generation agent that writes precise, clean, production-grade code snippets and modifications.';

  constructor(llm: LlmService) {
    super(llm);
  }

  async executePlanStep(stepDescription: string, context?: Record<string, unknown>): Promise<AgentResult<string>> {
    const task: AgentTask = {
      id: `exec-${Date.now()}`,
      description: stepDescription,
      context,
    };

    return this.executeTask<string>(
      task,
      'Write complete, executable code fulfilling the requested step. Do not use placeholders.',
      { temperature: 0.2 },
    );
  }
}
