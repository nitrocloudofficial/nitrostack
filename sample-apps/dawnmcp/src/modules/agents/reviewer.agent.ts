import { Injectable } from '@nitrostack/core';
import { BaseAgent, AgentTask, AgentResult } from './base.agent.js';
import { LlmService } from '../../shared/services/llm.service.js';

export interface CodeReviewResult {
  passed: boolean;
  score: number; // 0-100
  securityFindings: string[];
  qualityFindings: string[];
  suggestions: string[];
}

@Injectable()
export class ReviewerAgent extends BaseAgent {
  readonly name = 'ReviewerAgent';
  readonly roleDescription = 'Code review and quality control agent auditing code for security issues, anti-patterns, performance bottlenecks, and readability.';

  constructor(llm: LlmService) {
    super(llm);
  }

  async review(codeOrDiff: string, context?: Record<string, unknown>): Promise<AgentResult<CodeReviewResult>> {
    const task: AgentTask = {
      id: `review-${Date.now()}`,
      description: codeOrDiff,
      context,
    };

    return this.executeTask<CodeReviewResult>(
      task,
      'Perform a thorough code review. Evaluate security, performance, maintainability, and clean code principles.',
      { temperature: 0.1 },
    );
  }
}
