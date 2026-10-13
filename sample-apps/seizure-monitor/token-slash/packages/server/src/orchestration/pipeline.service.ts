import { Injectable } from '@nitrostack/core';
import type {
  FinalReport,
  ModuleResult,
  OrchestrationInput,
  OrchestrationOutput,
  SynthesisInput,
  TaskType,
} from '../shared/types.js';
import { DEFAULT_USER_ID } from '../shared/types.js';
import { ComplexityClassifierService } from '../tools/complexity-classifier.tool.js';
import { HistoryAnalyzerService } from '../tools/history-analyzer.tool.js';
import { ModelRecommenderService } from '../tools/model-recommender.tool.js';
import { TokenEstimatorService } from '../tools/token-estimator.tool.js';
import { MetaSynthesizerService } from './meta-synthesizer.service.js';
import { PromptRewriterService } from './prompt-rewriter.service.js';

const TOOL_TIMEOUT_MS = 5000;

type ModuleKey =
  | 'tokenEstimate'
  | 'complexity'
  | 'modelRecommendation'
  | 'history'
  | 'rewrite';

@Injectable()
export class PipelineService {
  constructor(
    private readonly tokenEstimator: TokenEstimatorService,
    private readonly complexityClassifier: ComplexityClassifierService,
    private readonly modelRecommender: ModelRecommenderService,
    private readonly historyAnalyzer: HistoryAnalyzerService,
    private readonly promptRewriter: PromptRewriterService,
    private readonly metaSynthesizer: MetaSynthesizerService,
  ) {}

  /**
   * Runs the full TokenSlash pipeline in dependency order:
   * 1. Token Estimator + Complexity Classifier + History Analyzer (parallel)
   * 2. Model Recommender (needs token + complexity)
   * 3. Prompt Rewriter (needs taskType)
   * 4. Meta-Synthesizer (fans in all outputs)
   */
  async analyzePrompt(input: OrchestrationInput): Promise<OrchestrationOutput> {
    const prompt = input.prompt ?? '';
    const userId = input.userId?.trim() || DEFAULT_USER_ID;

    const [tokenEstimate, complexity, history] = await Promise.all([
      this.runModule('tokenEstimate', () =>
        Promise.resolve(this.tokenEstimator.estimateTokens(prompt)),
      ),
      this.runModule('complexity', () =>
        Promise.resolve(this.complexityClassifier.classifyComplexity(prompt)),
      ),
      this.runModule('history', () =>
        Promise.resolve(this.historyAnalyzer.analyzeHistory(userId, prompt)),
      ),
    ]);

    const modelRecommendation = await this.runModule('modelRecommendation', () => {
      const tokenCount = tokenEstimate.data?.tokenCount ?? 0;
      const complexityScore = complexity.data?.complexityScore ?? 'simple';
      const taskType = complexity.data?.taskType ?? 'general-qa';

      return Promise.resolve(
        this.modelRecommender.recommendModel(tokenCount, complexityScore, taskType, 'gpt-4o', prompt),
      );
    });

    const taskType: TaskType = complexity.data?.taskType ?? 'general-qa';
    const rewrite = await this.runModule('rewrite', () =>
      Promise.resolve(this.promptRewriter.rewritePrompt(prompt, taskType)),
    );

    const synthesisInput: SynthesisInput = {
      originalPrompt: prompt,
      tokenEstimate,
      complexity,
      modelRecommendation,
      history,
      rewrite,
    };

    let finalReport: FinalReport;
    try {
      finalReport = this.metaSynthesizer.synthesizeReport(synthesisInput);
    } catch (error) {
      finalReport = this.metaSynthesizer.synthesizeReport({
        ...synthesisInput,
        rewrite: {
          ok: false,
          error: error instanceof Error ? error.message : 'Synthesis failed',
        },
      });
      finalReport.errors = {
        ...finalReport.errors,
        synthesis: error instanceof Error ? error.message : 'Synthesis failed',
      };
    }

    return { finalReport };
  }

  private async runModule<T>(
    _moduleKey: ModuleKey,
    fn: () => Promise<T>,
  ): Promise<ModuleResult<T>> {
    try {
      const data = await this.withTimeout(fn(), TOOL_TIMEOUT_MS);
      return { ok: true, data };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown module error';
      return { ok: false, error: message };
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Module timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }
}
