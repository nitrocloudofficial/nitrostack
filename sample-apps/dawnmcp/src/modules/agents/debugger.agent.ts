import { Injectable } from '@nitrostack/core';
import { BaseAgent, AgentTask, AgentResult } from './base.agent.js';
import { LlmService } from '../../shared/services/llm.service.js';

export interface DebugReport {
  rootCause: string;
  affectedComponents: string[];
  recommendedFix: string;
  preventionTips: string[];
}

@Injectable()
export class DebuggerAgent extends BaseAgent {
  readonly name = 'DebuggerAgent';
  readonly roleDescription = 'Root-cause analysis and debugging agent analyzing error logs, stack traces, and failing tests to recommend precise fixes.';

  constructor(llm: LlmService) {
    super(llm);
  }

  async debug(errorLogOrStackTrace: string, context?: Record<string, unknown>): Promise<AgentResult<DebugReport>> {
    const task: AgentTask = {
      id: `debug-${Date.now()}`,
      description: errorLogOrStackTrace,
      context,
    };

    return this.executeTask<DebugReport>(
      task,
      'Analyze the provided error log or stack trace. Identify the exact root cause and provide a step-by-step fix.',
      { temperature: 0.1 },
    );
  }
}
