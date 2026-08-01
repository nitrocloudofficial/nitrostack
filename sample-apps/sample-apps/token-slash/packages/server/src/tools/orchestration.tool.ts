import {
  ExecutionContext,
  Injectable,
  ToolDecorator as Tool,
  z,
} from '@nitrostack/core';
import type { OrchestrationOutput } from '../shared/types.js';
import { DEFAULT_USER_ID } from '../shared/types.js';
import { PipelineService } from '../orchestration/pipeline.service.js';

@Injectable()
export class OrchestrationTools {
  constructor(private readonly pipeline: PipelineService) {}

  /**
   * Primary TokenSlash entry point. Runs the full agentic pipeline:
   * Token Estimator + Complexity Classifier + History Analyzer (parallel),
   * then Model Recommender, Prompt Rewriter, and Meta-Synthesizer.
   * Returns a complete FinalReport for the dashboard.
   */
  @Tool({
    name: 'analyze_prompt',
    description:
      'Analyze an AI prompt end-to-end: estimate tokens, classify complexity, ' +
      'recommend a cheaper model, rewrite for efficiency, and project monthly savings. ' +
      'This is the main orchestration tool — call it once per user submission.',
    inputSchema: z.object({
      prompt: z
        .string()
        .describe('The raw prompt the user wants to analyze and optimize'),
      userId: z
        .string()
        .default(DEFAULT_USER_ID)
        .describe('Mock user ID for history-based savings projection'),
    }),
    examples: {
      request: {
        prompt:
          'Please kindly write a detailed summary of this quarterly report for me.',
        userId: 'demo-user',
      },
    },
  })
  async analyzePrompt(
    input: { prompt: string; userId?: string },
    ctx: ExecutionContext,
  ): Promise<OrchestrationOutput> {
    ctx.logger.info('Starting TokenSlash pipeline', {
      userId: input.userId ?? DEFAULT_USER_ID,
      promptLength: input.prompt.length,
    });

    const result = await this.pipeline.analyzePrompt({
      prompt: input.prompt,
      userId: input.userId ?? DEFAULT_USER_ID,
    });

    ctx.logger.info('TokenSlash pipeline complete', {
      tokenSavings: result.finalReport.tokenSavingsPercent,
      recommendedModel: result.finalReport.recommendedModel,
    });

    return result;
  }
}
