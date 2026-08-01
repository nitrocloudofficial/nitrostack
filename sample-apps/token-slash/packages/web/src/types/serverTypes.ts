// Synced copy of server contracts for frontend consumption (matching Member C's NitroStack MCP framework contract)
export type CapabilityTier = 'light' | 'standard' | 'advanced' | 'reasoning';

export interface RecommendedModelDetails {
  provider: string;
  model: string;
  reasoning: string;
  costPerRequest: number;
  monthlyCost: number;
  performanceScore: number; // Scale 0-100
  latencyMs: number;
  estimatedQuality: string;
}

export interface ModelComparisonItem {
  modelName: string;
  provider: string;
  perRequestCost: number;
  monthlyCost: number;
  latencyMs: number;
  performanceScore: number;
  isRecommended?: boolean;
}

export interface CostComparison {
  currentModel: ModelComparisonItem;
  recommendedModel: ModelComparisonItem;
  savingsPerRequest: number;
  monthlySavings: number;
  percentageSaved: number;
}

export interface FinalReport {
  originalPrompt: string;
  optimizedPrompt: string;
  tokenSavingsPercentage: number;
  originalTokens: number;
  optimizedTokens: number;
  recommendedModel: RecommendedModelDetails;
  costComparison: CostComparison;
  monthlySavingsEstimate: number;
  confidenceScore: number;
  executionSummary: string;
  suggestions: string[];
}
