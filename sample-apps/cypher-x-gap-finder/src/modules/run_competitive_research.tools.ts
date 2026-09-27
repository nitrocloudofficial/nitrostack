import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { PipelineOrchestratorService } from '../services/pipelineOrchestrator.service.js';
import { RunCompetitiveResearchInputSchema } from '../types/pipeline.types.js';

function pipelineWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [PipelineOrchestratorService] })
export class RunCompetitiveResearchTools {
    constructor(private readonly orchestratorService: PipelineOrchestratorService) {}

    @Tool({
        name: 'run_competitive_research',
        description: 'Execute the full 7-step AI Competitive Research pipeline for a product/startup idea automatically.',
        inputSchema: RunCompetitiveResearchInputSchema,
    })
    @Widget(pipelineWidget('pipeline-progress'))
    async runCompetitiveResearch(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        console.error('[START run_competitive_research] Input:', JSON.stringify(args));
        ctx.logger.info('[Tool: run_competitive_research] Pipeline Orchestrator Started', { input: JSON.stringify(args) });

        try {
            const parseResult = RunCompetitiveResearchInputSchema.safeParse(args || {});
            if (!parseResult.success) {
                throw new Error(`Invalid input: ${parseResult.error.message}`);
            }

            const input = {
                idea: parseResult.data.idea,
                industry: parseResult.data.industry || args?.industry || '',
                geography: parseResult.data.geography || args?.geography || '',
                targetAudience: parseResult.data.targetAudience || args?.targetAudience || ''
            };

            const result = await this.orchestratorService.runPipeline(input);
            const duration = Date.now() - startTime;

            console.error('[END run_competitive_research] Status:', result.status, `Time: ${duration}ms`);
            ctx.logger.info('[Tool: run_competitive_research] Pipeline Orchestrator Completed', { 
                status: result.status,
                currentStep: result.currentStep,
                durationMs: duration 
            });

            if (result.status === 'failed') {
                return {
                    success: false,
                    status: 'failed',
                    failedStage: result.failedStep || 'run_competitive_research',
                    message: result.message || 'Pipeline execution failed.',
                    error: result.error || 'Pipeline execution failed.',
                    steps: result.steps
                };
            }

            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[END run_competitive_research] [CRITICAL EXCEPTION]:', errorMessage, error.stack);
            ctx.logger.error('[Tool: run_competitive_research] Pipeline Orchestrator Failed', { error: errorMessage, durationMs: duration });

            return {
                success: false,
                status: 'failed',
                failedStage: error.failedStep || 'run_competitive_research',
                message: errorMessage,
                stack: error.stack,
                error: errorMessage
            };
        }
    }
}
