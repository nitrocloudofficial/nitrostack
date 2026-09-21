import { Injectable } from '@nitrostack/core';
import { BaseAgent, AgentTask, AgentResult } from './base.agent.js';
import { LlmService } from '../../shared/services/llm.service.js';

export interface ImplementationPlan {
  goal: string;
  phases: Array<{
    phaseNumber: number;
    name: string;
    description: string;
    tasks: string[];
  }>;
  considerations: string[];
}

@Injectable()
export class PlannerAgent extends BaseAgent {
  readonly name = 'PlannerAgent';
  readonly roleDescription = 'Architectural planning agent that breaks complex software tasks into structured step-by-step implementation plans.';

  constructor(llm: LlmService) {
    super(llm);
  }

  async plan(taskDescription: string, context?: Record<string, unknown>): Promise<AgentResult<ImplementationPlan>> {
    const task: AgentTask = {
      id: `plan-${Date.now()}`,
      description: taskDescription,
      context,
    };

    return this.executeTask<ImplementationPlan>(
      task,
      'Break down the user task into logical sequential phases with specific actionable steps.',
      { temperature: 0.3 },
    );
  }
}
