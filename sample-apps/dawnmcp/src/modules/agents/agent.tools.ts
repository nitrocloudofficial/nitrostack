import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { PlannerAgent } from './planner.agent.js';
import { ExecutorAgent } from './executor.agent.js';
import { ReviewerAgent } from './reviewer.agent.js';
import { DebuggerAgent } from './debugger.agent.js';

/**
 * AI Agents MCP Tools
 *
 * Exposes specialized AI agents (Planner, Executor, Reviewer, Debugger) as MCP tools.
 */
@Controller('agent')
export class AgentTools {
  constructor(
    private readonly planner: PlannerAgent,
    private readonly executor: ExecutorAgent,
    private readonly reviewer: ReviewerAgent,
    private readonly debuggerAgent: DebuggerAgent,
  ) {}

  @Tool({
    name: 'plan_task',
    description: 'Decompose a complex software engineering request into structured implementation phases using the PlannerAgent.',
    inputSchema: z.object({
      task: z.string().min(1).describe('Description of the feature, refactoring, or project to plan.'),
      context: z.record(z.unknown()).optional().describe('Optional context metadata.'),
    }),
  })
  async planTask(input: { task: string; context?: Record<string, unknown> }, ctx: ExecutionContext) {
    ctx.logger.info('Running PlannerAgent', { task: input.task });

    try {
      const result = await this.planner.plan(input.task, input.context);
      return { success: true, agent: result.agentName, plan: result.output, raw: result.rawResponse };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'execute_step',
    description: 'Generate production code or step-by-step implementation for a planned step using the ExecutorAgent.',
    inputSchema: z.object({
      step: z.string().min(1).describe('Description of the single implementation step to execute.'),
      context: z.record(z.unknown()).optional().describe('Optional code context or specifications.'),
    }),
  })
  async executeStep(input: { step: string; context?: Record<string, unknown> }, ctx: ExecutionContext) {
    ctx.logger.info('Running ExecutorAgent', { step: input.step });

    try {
      const result = await this.executor.executePlanStep(input.step, input.context);
      return { success: true, agent: result.agentName, result: result.output };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'review_code',
    description: 'Perform a comprehensive code review auditing security, performance, quality, and best practices using the ReviewerAgent.',
    inputSchema: z.object({
      code: z.string().min(1).describe('Source code or git diff to review.'),
      context: z.record(z.unknown()).optional().describe('Optional context.'),
    }),
  })
  async reviewCode(input: { code: string; context?: Record<string, unknown> }, ctx: ExecutionContext) {
    ctx.logger.info('Running ReviewerAgent');

    try {
      const result = await this.reviewer.review(input.code, input.context);
      return { success: true, agent: result.agentName, review: result.output };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  @Tool({
    name: 'debug_issue',
    description: 'Diagnose error logs, stack traces, or failing tests to identify root cause and recommended fix using the DebuggerAgent.',
    inputSchema: z.object({
      log: z.string().min(1).describe('Error log, stack trace, or failing test output.'),
      context: z.record(z.unknown()).optional().describe('Optional context.'),
    }),
  })
  async debugIssue(input: { log: string; context?: Record<string, unknown> }, ctx: ExecutionContext) {
    ctx.logger.info('Running DebuggerAgent');

    try {
      const result = await this.debuggerAgent.debug(input.log, input.context);
      return { success: true, agent: result.agentName, debugReport: result.output };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
