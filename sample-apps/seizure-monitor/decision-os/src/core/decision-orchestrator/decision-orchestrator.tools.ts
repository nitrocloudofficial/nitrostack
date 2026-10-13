import { Injectable, ControllerDecorator as Controller, Widget, UseGuards } from '@nitrostack/core';
import { ToolDecorator as Tool } from '@nitrostack/core';
import { DecisionOrchestratorService } from './decision-orchestrator.service.js';
import { 
  ClassifyDecisionSchema, 
  CreateExecutionPlanSchema, 
  ValidateExecutionPlanSchema,
  ExecuteDecisionPipelineSchema,
  AnalyzeDecisionSchema
} from './decision-orchestrator.schema.js';
import { 
  ClassifyDecisionArgs, 
  CreateExecutionPlanArgs, 
  ValidateExecutionPlanArgs,
  ExecuteDecisionPipelineArgs,
  AnalyzeDecisionArgs
} from './decision-orchestrator.types.js';
import { ApiKeyGuard } from '../auth/api-key.guard.js';

@Injectable({ deps: [DecisionOrchestratorService] })
@Controller()
export class DecisionOrchestratorTools {
  constructor(private readonly orchestratorService: DecisionOrchestratorService) {}

  private normalizeRequestArgs(args?: AnalyzeDecisionArgs | ExecuteDecisionPipelineArgs | string | Record<string, unknown>) {
    if (typeof args === 'string' && args.trim()) {
      return { request: args.trim() };
    }
    if (args && typeof args === 'object') {
      const record = args as Record<string, unknown>;
      const request =
        (typeof record.request === 'string' && record.request) ||
        (typeof record.query === 'string' && record.query) ||
        (typeof record.input === 'string' && record.input) ||
        (typeof record.prompt === 'string' && record.prompt) ||
        '';
      if (request.trim()) {
        return { request: request.trim() };
      }
    }
    return { request: 'General Decision Request' };
  }

  private formatToolError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
      return new Error(
        `AI provider rate limit reached while running analyzeDecision. Wait for the provider limit to reset and retry. Details: ${message}`
      );
    }
    return error instanceof Error ? error : new Error(message);
  }

  @Tool({
    name: 'analyzeDecision',
    description: 'Central decision orchestrator tool that extracts context, executes downstream engines, and returns a unified DecisionReport.',
    inputSchema: AnalyzeDecisionSchema
  })
  @UseGuards(ApiKeyGuard)
  @Widget('decision-dashboard')
  public async analyzeDecision(args?: AnalyzeDecisionArgs) {
    try {
      return await this.orchestratorService.analyzeDecision(this.normalizeRequestArgs(args));
    } catch (error: unknown) {
      console.error(error);
      console.error(error instanceof Error ? error.stack : undefined);
      throw this.formatToolError(error);
    }
  }

  @Tool({
    name: 'executeDecision',
    description: 'Executes the end-to-end DecisionOS intelligence pipeline for a decision request.',
    inputSchema: ExecuteDecisionPipelineSchema
  })
  @UseGuards(ApiKeyGuard)
  @Widget('decision-dashboard')
  public async executeDecision(args?: ExecuteDecisionPipelineArgs) {
    try {
      return await this.orchestratorService.analyzeDecision(this.normalizeRequestArgs(args));
    } catch (error: unknown) {
      console.error(error);
      console.error(error instanceof Error ? error.stack : undefined);
      throw this.formatToolError(error);
    }
  }

  @Tool({
    name: 'classifyDecision',
    description: 'Classifies the decision type and relevant domains.',
    inputSchema: ClassifyDecisionSchema
  })
  @UseGuards(ApiKeyGuard)
  public async classifyDecision(args?: ClassifyDecisionArgs) {
    return this.orchestratorService.classifyDecision(args || { request: '' });
  }

  @Tool({
    name: 'createExecutionPlan',
    description: 'Creates a Directed Acyclic Graph (DAG) plan for execution.',
    inputSchema: CreateExecutionPlanSchema
  })
  @UseGuards(ApiKeyGuard)
  public async createExecutionPlan(args?: CreateExecutionPlanArgs) {
    return this.orchestratorService.createExecutionPlan(args || { objective: '', domains: [] });
  }

  @Tool({
    name: 'validateExecutionPlan',
    description: 'Validates an execution plan for cyclic dependencies.',
    inputSchema: ValidateExecutionPlanSchema
  })
  @UseGuards(ApiKeyGuard)
  public async validateExecutionPlan(args?: ValidateExecutionPlanArgs) {
    return this.orchestratorService.validateExecutionPlan(args || { planId: '', steps: [] });
  }
}
