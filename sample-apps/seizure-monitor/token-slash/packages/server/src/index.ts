/**
 * Public exports for TokenSlash server integration.
 * Member D (dashboard) and teammates import types from here.
 */
export type {
  ComplexityResult,
  ComplexityScore,
  CostComparison,
  FinalReport,
  HistoryInsight,
  ModelRecommendation,
  ModuleAvailability,
  ModuleErrors,
  ModuleResult,
  OrchestrationInput,
  OrchestrationOutput,
  RewriteResult,
  SynthesisInput,
  TaskType,
  TokenEstimate,
} from './shared/types.js';

export {
  COMPLEXITY_SCORES,
  DEFAULT_CURRENT_MODEL,
  DEFAULT_USER_ID,
  TASK_TYPES,
} from './shared/types.js';

export { PipelineService } from './orchestration/pipeline.service.js';
export { PromptRewriterService } from './orchestration/prompt-rewriter.service.js';
export { MetaSynthesizerService } from './orchestration/meta-synthesizer.service.js';
export { AppModule } from './app.module.js';
