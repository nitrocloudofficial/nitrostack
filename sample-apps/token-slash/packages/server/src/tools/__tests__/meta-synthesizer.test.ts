import { describe, expect, it } from 'vitest';
import { MetaSynthesizerService } from '../../orchestration/meta-synthesizer.service.js';
import { PipelineService } from '../../orchestration/pipeline.service.js';
import { PromptRewriterService } from '../../orchestration/prompt-rewriter.service.js';
import { ComplexityClassifierService } from '../complexity-classifier.tool.js';
import { HistoryAnalyzerService } from '../history-analyzer.tool.js';
import { ModelRecommenderService } from '../model-recommender.tool.js';
import { TokenEstimatorService } from '../token-estimator.tool.js';
import type { SynthesisInput } from '../../shared/types.js';

function buildFullInput(overrides?: Partial<SynthesisInput>): SynthesisInput {
  return {
    originalPrompt: 'Please summarize this report in detail.',
    tokenEstimate: {
      ok: true,
      data: { tokenCount: 42, tokenizerUsed: 'test-tokenizer' },
    },
    complexity: {
      ok: true,
      data: {
        complexityScore: 'simple',
        taskType: 'summarization',
        reasoning: 'Short summarization request.',
      },
    },
    modelRecommendation: {
      ok: true,
      data: {
        recommendedModel: 'gpt-4o-mini',
        currentModelCost: 0.000105,
        recommendedModelCost: 0.0000063,
        savingsPercent: 94,
        reasoning: 'Simple task fits mini tier.',
      },
    },
    history: {
      ok: true,
      data: {
        monthlyPromptVolume: 142,
        projectedMonthlySavings: 18.4,
        userPatternSummary: 'Mostly summarization on premium models.',
      },
    },
    rewrite: {
      ok: true,
      data: {
        optimizedPrompt: 'Summarize this report.',
        tokenSavingsPercent: 35,
      },
    },
    ...overrides,
  };
}

describe('MetaSynthesizerService', () => {
  const synthesizer = new MetaSynthesizerService();

  it('produces a fully populated FinalReport from healthy inputs', () => {
    const report = synthesizer.synthesizeReport(buildFullInput());

    expect(report.originalPrompt).toBe('Please summarize this report in detail.');
    expect(report.optimizedPrompt).toBe('Summarize this report.');
    expect(report.tokenSavingsPercent).toBe(35);
    expect(report.recommendedModel).toBe('gpt-4o-mini');
    expect(report.monthlySavings).toBe(18.4);
    expect(report.tokenCount).toBe(42);
    expect(report.complexityScore).toBe('simple');
    expect(report.taskType).toBe('summarization');
    expect(report.availability.tokenEstimate).toBe(true);
    expect(report.availability.rewrite).toBe(true);
    expect(report.generatedAt).toBeTruthy();
    expect(report.costComparison.currentModel).toBe('gpt-4o');
    expect(report.costComparison.recommendedModel).toBe('gpt-4o-mini');
  });

  it('degrades gracefully when a module fails', () => {
    const report = synthesizer.synthesizeReport(
      buildFullInput({
        rewrite: { ok: false, error: 'Rewriter exploded' },
      }),
    );

    expect(report.optimizedPrompt).toBe('unavailable');
    expect(report.availability.rewrite).toBe(false);
    expect(report.errors.rewrite).toBe('Rewriter exploded');
    expect(report.recommendedModel).toBe('gpt-4o-mini');
    expect(report.monthlySavings).toBe(18.4);
  });

  it('uses safe defaults when multiple modules fail', () => {
    const report = synthesizer.synthesizeReport(
      buildFullInput({
        tokenEstimate: { ok: false, error: 'Tokenizer down' },
        complexity: { ok: false, error: 'Classifier down' },
        modelRecommendation: { ok: false, error: 'Recommender down' },
      }),
    );

    expect(report.tokenCount).toBe(0);
    expect(report.complexityScore).toBe('simple');
    expect(report.taskType).toBe('general-qa');
    expect(report.recommendedModel).toBe('unavailable');
    expect(report.errors.tokenEstimate).toBe('Tokenizer down');
    expect(report.errors.complexity).toBe('Classifier down');
    expect(report.errors.modelRecommendation).toBe('Recommender down');
  });
});

describe('PipelineService integration', () => {
  const pipeline = new PipelineService(
    new TokenEstimatorService(),
    new ComplexityClassifierService(),
    new ModelRecommenderService(),
    new HistoryAnalyzerService(new ModelRecommenderService()),
    new PromptRewriterService(),
    new MetaSynthesizerService(),
  );

  it('returns a complete FinalReport with no undefined required fields', async () => {
    const { finalReport } = await pipeline.analyzePrompt({
      prompt:
        'Please kindly I would like you to write a Python function that sorts a list.',
      userId: 'demo-user',
    });

    expect(finalReport.originalPrompt).toBeTruthy();
    expect(finalReport.optimizedPrompt).toBeTruthy();
    expect(typeof finalReport.tokenSavingsPercent).toBe('number');
    expect(finalReport.recommendedModel).toBeTruthy();
    expect(finalReport.costComparison).toBeDefined();
    expect(typeof finalReport.monthlySavings).toBe('number');
    expect(finalReport.generatedAt).toBeTruthy();
    expect(finalReport.availability).toBeDefined();
  });

  it('still returns a partial report when a module throws', async () => {
    const throwingPipeline = new PipelineService(
      {
        estimateTokens: () => {
          throw new Error('Simulated tokenizer failure');
        },
      } as TokenEstimatorService,
      new ComplexityClassifierService(),
      new ModelRecommenderService(),
      new HistoryAnalyzerService(new ModelRecommenderService()),
      new PromptRewriterService(),
      new MetaSynthesizerService(),
    );

    const { finalReport } = await throwingPipeline.analyzePrompt({
      prompt: 'Summarize this.',
      userId: 'demo-user',
    });

    expect(finalReport.availability.tokenEstimate).toBe(false);
    expect(finalReport.errors.tokenEstimate).toContain('Simulated tokenizer failure');
    expect(finalReport.optimizedPrompt).toBeTruthy();
  });
});
