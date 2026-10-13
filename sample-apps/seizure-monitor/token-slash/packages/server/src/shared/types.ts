export type CapabilityTier = 'light' | 'standard' | 'advanced' | 'reasoning';
export type ComplexityScore = 'simple' | 'moderate' | 'complex';
export type TaskType =
  | 'general-qa'
  | 'code-generation'
  | 'summarization'
  | 'data-analysis'
  | 'reasoning'
  | 'creative-writing';

export const DEFAULT_USER_ID = 'demo-user';
export const DEFAULT_CURRENT_MODEL = 'gpt-4o';
export const COMPLEXITY_SCORES: ComplexityScore[] = ['simple', 'moderate', 'complex'];
export const TASK_TYPES: TaskType[] = [
  'general-qa',
  'code-generation',
  'summarization',
  'data-analysis',
  'reasoning',
  'creative-writing',
];

export interface TokenCount {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

export interface TokenEstimate {
  tokenCount: number;
  inputTokens?: number;
  outputTokens?: number;
  tokenizerUsed?: string;
}

export interface ComplexityClassification {
  complexityScore: number;
  taskType: string;
  reasoning: string;
  minimumCapableTier: CapabilityTier;
}

export interface ComplexityResult {
  complexityScore: ComplexityScore;
  taskType: TaskType;
  reasoning: string;
  minimumCapableTier?: CapabilityTier;
}

export interface ModelPricing {
  provider: string;
  model: string;
  tier: CapabilityTier;
  inputCostPerM: number;
  outputCostPerM: number;
  maxContextTokens?: number;
  source: string;
}

export interface PricingTableData {
  asOf: string;
  sources: Record<string, string>;
  models: ModelPricing[];
}

export interface PromptHistoryEntry {
  id: string;
  userId: string;
  timestamp: string;
  promptText: string;
  inputTokens: number;
  outputTokens: number;
  modelUsed: string;
  complexityScore: number;
  taskType: string;
  retriesCount: number;
  userSatisfied: boolean;
  timeToSatisfactionSeconds: number;
  cost: number;
}

export interface ModelRecommendationResult {
  recommendedModel: string;
  provider?: string;
  currentModelCost: number;
  recommendedModelCost: number;
  savingsPercent: number;
  reasoning: string;
}

export type ModelRecommendation = ModelRecommendationResult;

export interface SatisfactionMetrics {
  avgSatisfactionRate: number;
  avgTimeToSatisfactionSec: number;
  satisfactionScore: number;
  recommendedAdjustment: string;
}

export interface HistoryAnalyzerResult {
  monthlyPromptVolume: number;
  projectedMonthlySavings: number;
  userPatternSummary: string;
  satisfactionMetrics?: SatisfactionMetrics;
}

export type HistoryInsight = HistoryAnalyzerResult;

export interface SatisfactionModelWeights {
  intercept: number;
  featureWeights: {
    complexityScore: number;
    tokenVolume: number;
    tierMismatch: number;
    retryCountPenalty: number;
  };
  accuracy: number;
  precision: number;
  recall: number;
  trainedAt: string;
}

export interface RewriteResult {
  originalPrompt: string;
  optimizedPrompt: string;
  originalTokens?: number;
  optimizedTokens?: number;
  tokenSavingsPercent: number;
  taskType: TaskType;
  appliedOptimizations?: string[];
}

export interface ModuleResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface SynthesisInput {
  originalPrompt: string;
  tokenEstimate: ModuleResult<TokenEstimate>;
  complexity: ModuleResult<ComplexityResult>;
  modelRecommendation: ModuleResult<ModelRecommendation>;
  history: ModuleResult<HistoryInsight>;
  rewrite: ModuleResult<RewriteResult>;
}

export interface ModuleAvailability {
  tokenEstimate: boolean;
  complexity: boolean;
  modelRecommendation: boolean;
  history: boolean;
  rewrite: boolean;
}

export interface ModuleErrors {
  tokenEstimate?: string;
  complexity?: string;
  modelRecommendation?: string;
  history?: string;
  rewrite?: string;
  synthesis?: string;
}

export interface CostComparison {
  currentModel: string;
  recommendedModel: string;
  currentCostPerRequest: number;
  recommendedCostPerRequest: number;
  currentMonthlyCost: number;
  recommendedMonthlyCost: number;
  savingsPercent: number;
}

export interface FinalReport {
  originalPrompt: string;
  optimizedPrompt: string;
  tokenSavingsPercent: number;
  recommendedModel: string;
  costComparison: CostComparison;
  monthlySavings: number;
  tokenCount: number;
  complexityScore: ComplexityScore;
  taskType: TaskType;
  modelRecommendationReasoning: string;
  userPatternSummary: string;
  monthlyPromptVolume: number;
  availability: ModuleAvailability;
  errors: ModuleErrors;
  generatedAt: string;
}

export interface OrchestrationInput {
  prompt: string;
  userId?: string;
}

export interface OrchestrationOutput {
  finalReport: FinalReport;
}
