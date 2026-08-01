import {
  ExecutionContext,
  Injectable,
  ToolDecorator as Tool,
  z,
} from '@nitrostack/core';
import type {
  ComplexityResult,
  FinalReport,
  HistoryInsight,
  ModelRecommendation,
  RewriteResult,
  SynthesisInput,
  TokenEstimate,
} from '../shared/types.js';
import { MetaSynthesizerService } from '../orchestration/meta-synthesizer.service.js';

@Injectable()
export class MetaSynthesizerTools {
  constructor(private readonly metaSynthesizer: MetaSynthesizerService) {}

  /**
   * Combines outputs from all upstream TokenSlash modules into a single FinalReport
   * object suitable for dashboard rendering. Degrades gracefully — if any upstream
   * module failed, its section is marked unavailable rather than crashing synthesis.
   */
  @Tool({
    name: 'synthesize_report',
    description:
      'Merge Token Estimator, Complexity Classifier, Model Recommender, ' +
      'History Analyzer, and Prompt Rewriter outputs into one FinalReport for the UI.',
    inputSchema: z.object({
      originalPrompt: z.string().describe('The original user prompt'),
      tokenEstimate: z
        .object({
          ok: z.boolean(),
          data: z
            .object({
              tokenCount: z.number(),
              tokenizerUsed: z.string(),
            })
            .optional(),
          error: z.string().optional(),
        })
        .describe('Wrapped Token Estimator result'),
      complexity: z
        .object({
          ok: z.boolean(),
          data: z
            .object({
              complexityScore: z.enum(['simple', 'moderate', 'complex']),
              taskType: z.string(),
              reasoning: z.string(),
            })
            .optional(),
          error: z.string().optional(),
        })
        .describe('Wrapped Complexity Classifier result'),
      modelRecommendation: z
        .object({
          ok: z.boolean(),
          data: z
            .object({
              recommendedModel: z.string(),
              currentModelCost: z.number(),
              recommendedModelCost: z.number(),
              savingsPercent: z.number(),
              reasoning: z.string(),
            })
            .optional(),
          error: z.string().optional(),
        })
        .describe('Wrapped Model Recommender result'),
      history: z
        .object({
          ok: z.boolean(),
          data: z
            .object({
              monthlyPromptVolume: z.number(),
              projectedMonthlySavings: z.number(),
              userPatternSummary: z.string(),
            })
            .optional(),
          error: z.string().optional(),
        })
        .describe('Wrapped History Analyzer result'),
      rewrite: z
        .object({
          ok: z.boolean(),
          data: z
            .object({
              optimizedPrompt: z.string(),
              tokenSavingsPercent: z.number(),
            })
            .optional(),
          error: z.string().optional(),
        })
        .describe('Wrapped Prompt Rewriter result'),
    }),
  })
  synthesizeReport(
    input: {
      originalPrompt: string;
      tokenEstimate: SynthesisInput['tokenEstimate'];
      complexity: SynthesisInput['complexity'];
      modelRecommendation: SynthesisInput['modelRecommendation'];
      history: SynthesisInput['history'];
      rewrite: SynthesisInput['rewrite'];
    },
    _ctx: ExecutionContext,
  ): FinalReport {
    return this.metaSynthesizer.synthesizeReport({
      originalPrompt: input.originalPrompt,
      tokenEstimate: input.tokenEstimate as SynthesisInput['tokenEstimate'],
      complexity: input.complexity as SynthesisInput['complexity'],
      modelRecommendation:
        input.modelRecommendation as SynthesisInput['modelRecommendation'],
      history: input.history as SynthesisInput['history'],
      rewrite: input.rewrite as SynthesisInput['rewrite'],
    });
  }
}

/** Exported for direct unit testing without MCP tool wrapper. */
export type {
  TokenEstimate,
  ComplexityResult,
  ModelRecommendation,
  HistoryInsight,
  RewriteResult,
};
